import { HttpsError, onCall } from "firebase-functions/v2/https";
import { db } from "./admin";
import { ApiError } from "./errors";
import {
  CALENDAR_SCOPES,
  REGION,
  TIMEZONE,
  agendaTokenSecret,
  googleClientId,
  oauthRedirectUri,
} from "./params";
import { signOauthState } from "./tokens";
import {
  clipText,
  intInRange,
  minutesOf,
  normalizeDias,
  normalizeSlug,
  optionalHttpsUrl,
  parseHour,
  requireText,
} from "./validate";

async function requireDono(uid: string | undefined): Promise<string> {
  if (!uid) throw new HttpsError("unauthenticated", "Entre na sua conta.");
  const snap = await db.collection("membros").doc(uid).get();
  const data = snap.data();
  if (!snap.exists || data?.papel !== "dono") {
    throw new HttpsError("permission-denied", "Só o dono da empresa configura a agenda.");
  }
  const empresaId = String(data?.empresa_id ?? "");
  if (!empresaId) {
    throw new HttpsError("failed-precondition", "Crie a empresa antes de configurar a agenda.");
  }
  return empresaId;
}

function publicMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof HttpsError) return error.message;
  return fallback;
}

export const agendaSalvarConfig = onCall({ region: REGION, cors: true }, async (request) => {
  const empresaId = await requireDono(request.auth?.uid);
  const data = (request.data ?? {}) as Record<string, unknown>;
  try {
    const slug = normalizeSlug(data.slug);
    const titulo = requireText(data.titulo, 80, "o título");
    const descricao = clipText(data.descricao, 500);
    const logoUrl = optionalHttpsUrl(data.logoUrl ?? data.logo_url);
    const duracaoMin = intInRange(data.duracaoMin ?? data.duracao_min, 15, 180, "A duração");
    const dias = normalizeDias(data.dias);
    const horaInicio = parseHour(data.horaInicio ?? data.hora_inicio, "O horário inicial");
    const horaFim = parseHour(data.horaFim ?? data.hora_fim, "O horário final");
    if (minutesOf(horaInicio) >= minutesOf(horaFim)) {
      throw new ApiError(400, "O horário final precisa ser depois do inicial.");
    }
    if (minutesOf(horaFim) - minutesOf(horaInicio) < duracaoMin) {
      throw new ApiError(400, "O expediente precisa caber pelo menos uma reunião.");
    }
    const intervaloMin = intInRange(data.intervaloMin ?? data.intervalo_min, 0, 120, "O intervalo");
    const antecedenciaHoras = intInRange(
      data.antecedenciaHoras ?? data.antecedencia_horas,
      0,
      168,
      "A antecedência",
    );
    const janelaDias = intInRange(data.janelaDias ?? data.janela_dias, 1, 60, "A janela");

    await db.runTransaction(async (tx) => {
      const slugRef = db.collection("agenda_slugs").doc(slug);
      const configRef = db.collection("agenda_config").doc(empresaId);
      const slugSnap = await tx.get(slugRef);
      const configSnap = await tx.get(configRef);
      if (slugSnap.exists && slugSnap.data()?.empresa_id !== empresaId) {
        throw new ApiError(409, "Esse link público já está em uso.");
      }
      const oldSlug = String(configSnap.data()?.slug ?? "");
      if (oldSlug && oldSlug !== slug) {
        tx.delete(db.collection("agenda_slugs").doc(oldSlug));
      }
      tx.set(slugRef, { empresa_id: empresaId });
      tx.set(
        configRef,
        {
          empresa_id: empresaId,
          slug,
          titulo,
          descricao,
          logo_url: logoUrl,
          duracao_min: duracaoMin,
          dias,
          hora_inicio: horaInicio,
          hora_fim: horaFim,
          fuso: TIMEZONE,
          intervalo_min: intervaloMin,
          antecedencia_horas: antecedenciaHoras,
          janela_dias: janelaDias,
        },
        { merge: true },
      );
    });
    return { slug };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    const status = error instanceof ApiError ? error.status : 500;
    throw new HttpsError(
      status === 409 ? "already-exists" : status >= 500 ? "internal" : "invalid-argument",
      publicMessage(error, "Não foi possível salvar a agenda."),
    );
  }
});

export const agendaIniciarOauth = onCall(
  { region: REGION, cors: true, secrets: [agendaTokenSecret] },
  async (request) => {
    const empresaId = await requireDono(request.auth?.uid);
    const clientId = googleClientId.value();
    if (!clientId) {
      throw new HttpsError(
        "failed-precondition",
        "O Google Calendar ainda não foi configurado neste projeto.",
      );
    }
    const state = signOauthState(agendaTokenSecret.value(), empresaId, request.auth?.uid ?? "");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", oauthRedirectUri());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", CALENDAR_SCOPES.join(" "));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("state", state);
    return { url: url.toString() };
  },
);
