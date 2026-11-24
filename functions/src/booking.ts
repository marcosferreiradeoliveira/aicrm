import { Timestamp, type DocumentData, type DocumentSnapshot } from "firebase-admin/firestore";
import { db } from "./admin";
import { ApiError } from "./errors";
import { createMeetEvent, deleteEvent, patchEvent, queryFreeBusy } from "./google";
import { appUrl } from "./params";
import { assertRateLimit } from "./rateLimit";
import {
  buildSlots,
  formatMeetingLabel,
  slotExists,
  type AgendaHours,
  type Range,
} from "./slots";
import { readManageToken, signManageToken } from "./tokens";
import {
  ETAPAS,
  ORIGENS,
  SENTIMENTOS,
  URGENCIAS,
  assertEnum,
  clipText,
  normalizeEmail,
  normalizePhone,
  origemMantida,
  parseInicio,
  phoneLookupVariants,
  requireText,
} from "./validate";

export interface StoredAgenda extends AgendaHours {
  empresaId: string;
  slug: string;
  titulo: string;
  descricao: string;
  logoUrl: string;
  fuso: string;
  googleConectado: boolean;
  googleEmail: string;
}

function siteUrl(): string {
  return appUrl.value().replace(/\/+$/, "");
}

function readConfig(empresaId: string, data: DocumentData): StoredAgenda {
  const dias = Array.isArray(data.dias)
    ? data.dias.map((day) => Number(day)).filter((day) => day >= 1 && day <= 7)
    : [1, 2, 3, 4, 5];
  return {
    empresaId,
    slug: String(data.slug ?? ""),
    titulo: String(data.titulo || "Reunião"),
    descricao: String(data.descricao ?? ""),
    logoUrl: String(data.logo_url ?? ""),
    duracaoMin: Number(data.duracao_min ?? 30),
    dias: dias.length > 0 ? dias : [1, 2, 3, 4, 5],
    horaInicio: String(data.hora_inicio ?? "09:00"),
    horaFim: String(data.hora_fim ?? "18:00"),
    fuso: "America/Sao_Paulo",
    intervaloMin: Number(data.intervalo_min ?? 0),
    antecedenciaHoras: Number(data.antecedencia_horas ?? 4),
    janelaDias: Number(data.janela_dias ?? 14),
    googleConectado: data.google_conectado === true,
    googleEmail: String(data.google_email ?? ""),
  };
}

async function loadBySlug(slug: string): Promise<{ config: StoredAgenda; empresaNome: string }> {
  const slugSnap = await db.collection("agenda_slugs").doc(slug).get();
  const empresaId = String(slugSnap.data()?.empresa_id ?? "");
  if (!slugSnap.exists || !empresaId) throw new ApiError(404, "Agenda não encontrada.");
  const [configSnap, empresaSnap] = await Promise.all([
    db.collection("agenda_config").doc(empresaId).get(),
    db.collection("empresas").doc(empresaId).get(),
  ]);
  if (!configSnap.exists) throw new ApiError(404, "Agenda não encontrada.");
  const config = readConfig(empresaId, configSnap.data() ?? {});
  return {
    config,
    empresaNome: String(empresaSnap.data()?.nome ?? config.titulo),
  };
}

async function refreshTokenOf(empresaId: string): Promise<string> {
  const snap = await db.collection("agenda_segredos").doc(empresaId).get();
  const token = snap.data()?.refresh_token;
  if (typeof token !== "string" || !token) {
    throw new ApiError(409, "Esta agenda ainda não está conectada ao Google Calendar.");
  }
  return token;
}

function googleAuth(clientId: string, clientSecret: string) {
  if (!clientId || !clientSecret) {
    throw new ApiError(503, "O Google Calendar ainda não foi configurado neste projeto.");
  }
  return { clientId, clientSecret };
}

function isAlreadyExists(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    (error as { code: unknown }).code === 6;
}

async function busyRanges(
  config: StoredAgenda,
  clientId: string,
  clientSecret: string,
  ignore?: { id?: string; start?: Date },
): Promise<Range[]> {
  const now = new Date();
  const until = new Date(now.getTime() + (config.janelaDias + 1) * 24 * 60 * 60 * 1000);
  const refreshToken = await refreshTokenOf(config.empresaId);
  const [remote, localSnap] = await Promise.all([
    queryFreeBusy({
      refreshToken,
      clientId,
      clientSecret,
      timeMin: now,
      timeMax: until,
    }),
    db
      .collection("agendamentos")
      .where("empresa_id", "==", config.empresaId)
      .where("status", "==", "confirmado")
      .where("inicio", ">=", Timestamp.fromDate(new Date(now.getTime() - 60 * 60 * 1000)))
      .where("inicio", "<", Timestamp.fromDate(until))
      .get()
      .catch((error) => {
        console.error("Falha ao ler agendamentos locais", error);
        return null;
      }),
  ]);
  const local: Range[] = [];
  localSnap?.docs.forEach((item) => {
    if (item.id === ignore?.id) return;
    const inicio = item.data().inicio;
    const fim = item.data().fim;
    if (inicio instanceof Timestamp && fim instanceof Timestamp) {
      local.push({ start: inicio.toDate(), end: fim.toDate() });
    }
  });
  const remoteFiltered = ignore?.start
    ? remote.filter((item) => Math.abs(item.start.getTime() - ignore.start!.getTime()) > 60_000)
    : remote;
  return [...remoteFiltered, ...local];
}

export async function publicProfile(slug: string) {
  const { config, empresaNome } = await loadBySlug(slug);
  return {
    slug: config.slug,
    titulo: config.titulo,
    descricao: config.descricao,
    logoUrl: config.logoUrl,
    empresaNome,
    duracaoMin: config.duracaoMin,
    fuso: config.fuso,
    googleConectado: config.googleConectado,
  };
}

export async function listHorarios(
  slug: string,
  ip: string,
  clientId: string,
  clientSecret: string,
  ignore?: { id?: string; start?: Date },
) {
  await assertRateLimit("horarios", ip);
  const { config } = await loadBySlug(slug);
  const auth = googleAuth(clientId, clientSecret);
  const busy = await busyRanges(config, auth.clientId, auth.clientSecret, ignore);
  return {
    duracaoMin: config.duracaoMin,
    dias: buildSlots(config, busy),
  };
}

function manageUrl(token: string): string {
  return `${siteUrl()}/agendar/gerenciar?token=${encodeURIComponent(token)}`;
}

function eventText(input: {
  nome: string;
  email: string;
  phone: string;
  empresa: string;
  pedido: string;
  url: string;
}): string {
  return [
    "Agendado pela página da BuildAI Leads.",
    `Convidado: ${input.nome} <${input.email}>`,
    `WhatsApp: ${input.phone}`,
    input.empresa ? `Empresa: ${input.empresa}` : "",
    input.pedido ? `Pedido: ${input.pedido}` : "",
    "",
    `Cancelar ou remarcar: ${input.url}`,
  ]
    .filter((line) => line !== "")
    .join("\n")
    .slice(0, 7000);
}

async function findLead(
  empresaId: string,
  phone: string,
  leadId: string,
): Promise<DocumentSnapshot | null> {
  if (leadId) {
    const byId = await db.collection("leads").doc(leadId).get();
    if (byId.exists && byId.data()?.empresa_id === empresaId) return byId;
  }
  for (const variant of phoneLookupVariants(phone)) {
    const found = await db
      .collection("leads")
      .where("empresa_id", "==", empresaId)
      .where("telefone", "==", variant)
      .limit(1)
      .get();
    if (!found.empty) return found.docs[0];
  }
  return null;
}

export async function confirmBooking(
  slug: string,
  body: Record<string, unknown>,
  ip: string,
  clientId: string,
  clientSecret: string,
  tokenSecret: string,
) {
  const nome = requireText(body.nome, 120, "o nome");
  const phone = normalizePhone(body.telefone ?? body.tel);
  const email = normalizeEmail(body.email);
  const empresa = clipText(body.empresa, 160);
  const pedido = clipText(body.mensagem ?? body.pedido, 2000);
  const leadHint = clipText(body.leadId ?? body.lead, 128);
  const inicio = parseInicio(body.inicio);
  await assertRateLimit("confirmar", ip, phone);

  const { config } = await loadBySlug(slug);
  const auth = googleAuth(clientId, clientSecret);
  const busy = await busyRanges(config, auth.clientId, auth.clientSecret);
  if (!slotExists(config, busy, inicio)) {
    throw new ApiError(409, "Esse horário não está mais livre. Escolha outro.");
  }

  const fim = new Date(inicio.getTime() + config.duracaoMin * 60 * 1000);
  const lockRef = db.collection("agenda_travas").doc(`${config.empresaId}_${inicio.getTime()}`);
  try {
    await lockRef.create({
      empresa_id: config.empresaId,
      inicio: Timestamp.fromDate(inicio),
      criado_em: Timestamp.now(),
    });
  } catch (error) {
    if (isAlreadyExists(error)) {
      throw new ApiError(409, "Esse horário acabou de ser reservado. Escolha outro.");
    }
    throw error;
  }

  const agendamentoRef = db.collection("agendamentos").doc();
  const token = signManageToken(tokenSecret, agendamentoRef.id);
  const url = manageUrl(token);
  const summary = `${config.titulo} · ${nome}`.slice(0, 180);
  const description = eventText({ nome, email, phone, empresa, pedido, url });
  let eventId = "";
  try {
    const event = await createMeetEvent({
      ...auth,
      refreshToken: await refreshTokenOf(config.empresaId),
      summary,
      description,
      start: inicio,
      end: fim,
      attendeeEmail: email,
      requestId: agendamentoRef.id,
    });
    eventId = event.eventId;
    const leadId = await upsertLead({
      empresaId: config.empresaId,
      nome,
      phone,
      empresa,
      pedido,
      inicio,
      leadHint,
      meetLink: event.meetLink,
    });
    const now = Timestamp.now();
    await agendamentoRef.set({
      empresa_id: config.empresaId,
      lead_id: leadId,
      inicio: Timestamp.fromDate(inicio),
      fim: Timestamp.fromDate(fim),
      google_event_id: event.eventId,
      meet_link: event.meetLink,
      status: "confirmado",
      convidado_nome: nome,
      convidado_email: email,
      convidado_telefone: phone,
      criado_em: now,
    });
    return {
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      meetLink: event.meetLink,
      manageUrl: url,
      titulo: config.titulo,
    };
  } catch (error) {
    await lockRef.delete().catch(() => undefined);
    if (eventId) {
      await deleteEvent({
        ...auth,
        refreshToken: await refreshTokenOf(config.empresaId),
        eventId,
      }).catch(() => undefined);
    }
    throw error;
  }
}

async function upsertLead(input: {
  empresaId: string;
  nome: string;
  phone: string;
  empresa: string;
  pedido: string;
  inicio: Date;
  leadHint: string;
  meetLink: string;
}): Promise<string> {
  const etapa = assertEnum("reuniao_agendada", ETAPAS, "etapa");
  const now = Timestamp.now();
  const passo = `Reunião em ${formatMeetingLabel(input.inicio)}`.slice(0, 300);
  const conteudo = [
    `${passo}.`,
    `Google Meet: ${input.meetLink}`,
    input.pedido ? `Pedido: ${input.pedido}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 4000);
  const existing = await findLead(input.empresaId, input.phone, input.leadHint);
  let leadId: string;
  if (existing) {
    leadId = existing.id;
    const patch: Record<string, unknown> = {
      nome: input.nome,
      telefone: input.phone,
      etapa,
      origem: origemMantida(existing.data()?.origem),
      proximo_passo: passo,
      data_proximo_passo: Timestamp.fromDate(input.inicio),
      updated_at: now,
    };
    if (input.empresa) patch.empresa = input.empresa;
    await existing.ref.update(patch);
  } else {
    const created = await db.collection("leads").add({
      empresa_id: input.empresaId,
      nome: input.nome,
      telefone: input.phone,
      empresa: input.empresa || null,
      segmento: null,
      demanda: input.pedido ? input.pedido.slice(0, 500) : null,
      volume: null,
      urgencia: assertEnum("media", URGENCIAS, "urgencia"),
      sentimento: assertEnum("neutro", SENTIMENTOS, "sentimento"),
      nota: 0,
      origem: assertEnum("site", ORIGENS, "origem"),
      etapa,
      resumo: null,
      handoff: false,
      proximo_passo: passo,
      data_proximo_passo: Timestamp.fromDate(input.inicio),
      responsavel: null,
      created_at: now,
      updated_at: now,
    });
    leadId = created.id;
  }
  await db.collection("interacoes").add({
    empresa_id: input.empresaId,
    lead_id: leadId,
    tipo: "reuniao",
    conteudo,
    created_at: now,
  });
  return leadId;
}

interface MeetingDoc {
  id: string;
  empresaId: string;
  leadId: string;
  inicio: Date;
  fim: Date;
  eventId: string;
  meetLink: string;
  status: string;
  nome: string;
}

function meetingFrom(snap: DocumentSnapshot): MeetingDoc {
  const data = snap.data() ?? {};
  const inicio = data.inicio instanceof Timestamp ? data.inicio.toDate() : new Date(0);
  const fim = data.fim instanceof Timestamp ? data.fim.toDate() : new Date(0);
  return {
    id: snap.id,
    empresaId: String(data.empresa_id ?? ""),
    leadId: String(data.lead_id ?? ""),
    inicio,
    fim,
    eventId: String(data.google_event_id ?? ""),
    meetLink: String(data.meet_link ?? ""),
    status: String(data.status ?? ""),
    nome: String(data.convidado_nome ?? ""),
  };
}

async function meetingByToken(tokenSecret: string, token: string): Promise<MeetingDoc> {
  const parsed = readManageToken(tokenSecret, token);
  if (!parsed) throw new ApiError(403, "Este link expirou ou não é válido.");
  const snap = await db.collection("agendamentos").doc(parsed.agendamentoId).get();
  if (!snap.exists) throw new ApiError(404, "Agendamento não encontrado.");
  return meetingFrom(snap);
}

async function configOf(empresaId: string): Promise<StoredAgenda> {
  const snap = await db.collection("agenda_config").doc(empresaId).get();
  if (!snap.exists) throw new ApiError(404, "Agenda não encontrada.");
  return readConfig(empresaId, snap.data() ?? {});
}

export async function manageBooking(
  body: Record<string, unknown>,
  ip: string,
  clientId: string,
  clientSecret: string,
  tokenSecret: string,
) {
  await assertRateLimit("gerenciar", ip);
  const token = String(body.token ?? "");
  const acao = String(body.acao ?? "detalhe");
  const meeting = await meetingByToken(tokenSecret, token);
  const config = await configOf(meeting.empresaId);
  if (acao === "detalhe") {
    return {
      titulo: config.titulo,
      inicio: meeting.inicio.toISOString(),
      fim: meeting.fim.toISOString(),
      meetLink: meeting.meetLink,
      status: meeting.status,
      nome: meeting.nome,
      duracaoMin: config.duracaoMin,
      slug: config.slug,
    };
  }
  if (meeting.status !== "confirmado") {
    throw new ApiError(409, "Esta reunião não está mais ativa.");
  }
  const auth = googleAuth(clientId, clientSecret);
  const refreshToken = await refreshTokenOf(config.empresaId);

  if (acao === "horarios") {
    const busy = await busyRanges(config, auth.clientId, auth.clientSecret, {
      id: meeting.id,
      start: meeting.inicio,
    });
    return { duracaoMin: config.duracaoMin, dias: buildSlots(config, busy) };
  }

  if (acao === "cancelar") {
    if (meeting.eventId) {
      await deleteEvent({ ...auth, refreshToken, eventId: meeting.eventId });
    }
    await db.collection("agendamentos").doc(meeting.id).update({ status: "cancelado" });
    await db
      .collection("agenda_travas")
      .doc(`${meeting.empresaId}_${meeting.inicio.getTime()}`)
      .delete()
      .catch(() => undefined);
    await noteOnLead(
      meeting,
      "Reunião cancelada pelo link de agendamento.",
      "Reunião cancelada",
      null,
    );
    return { status: "cancelado" };
  }

  if (acao === "remarcar") {
    const inicio = parseInicio(body.inicio);
    if (Math.abs(inicio.getTime() - meeting.inicio.getTime()) < 1000) {
      return {
        inicio: meeting.inicio.toISOString(),
        fim: meeting.fim.toISOString(),
        meetLink: meeting.meetLink,
        status: "confirmado",
        titulo: config.titulo,
      };
    }
    const busy = await busyRanges(config, auth.clientId, auth.clientSecret, {
      id: meeting.id,
      start: meeting.inicio,
    });
    if (!slotExists(config, busy, inicio)) {
      throw new ApiError(409, "Esse horário não está mais livre. Escolha outro.");
    }
    const fim = new Date(inicio.getTime() + config.duracaoMin * 60 * 1000);
    const lockRef = db.collection("agenda_travas").doc(`${config.empresaId}_${inicio.getTime()}`);
    try {
      await lockRef.create({
        empresa_id: config.empresaId,
        inicio: Timestamp.fromDate(inicio),
        criado_em: Timestamp.now(),
      });
    } catch (error) {
      if (isAlreadyExists(error)) {
        throw new ApiError(409, "Esse horário acabou de ser reservado. Escolha outro.");
      }
      throw error;
    }
    try {
      const url = manageUrl(token);
      const summary = `${config.titulo} · ${meeting.nome}`.slice(0, 180);
      const description = `Reunião remarcada para ${formatMeetingLabel(inicio)}.\nCancelar ou remarcar: ${url}`;
      const meetLink =
        (await patchEvent({
          ...auth,
          refreshToken,
          eventId: meeting.eventId,
          summary,
          description,
          start: inicio,
          end: fim,
        })) || meeting.meetLink;
      await db.collection("agendamentos").doc(meeting.id).update({
        inicio: Timestamp.fromDate(inicio),
        fim: Timestamp.fromDate(fim),
        meet_link: meetLink,
        status: "confirmado",
      });
      await db
        .collection("agenda_travas")
        .doc(`${meeting.empresaId}_${meeting.inicio.getTime()}`)
        .delete()
        .catch(() => undefined);
      const passo = `Reunião em ${formatMeetingLabel(inicio)}`;
      await noteOnLead(
        meeting,
        `Reunião remarcada para ${formatMeetingLabel(inicio)}.\nGoogle Meet: ${meetLink}`,
        passo,
        Timestamp.fromDate(inicio),
      );
      return {
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        meetLink,
        status: "confirmado",
        titulo: config.titulo,
      };
    } catch (error) {
      await lockRef.delete().catch(() => undefined);
      throw error;
    }
  }

  throw new ApiError(400, "Ação inválida.");
}

async function noteOnLead(
  meeting: MeetingDoc,
  conteudo: string,
  proximoPasso: string,
  quando: Timestamp | null,
): Promise<void> {
  const now = Timestamp.now();
  await db.collection("interacoes").add({
    empresa_id: meeting.empresaId,
    lead_id: meeting.leadId,
    tipo: "reuniao",
    conteudo: conteudo.slice(0, 4000),
    created_at: now,
  });
  if (!meeting.leadId) return;
  const lead = await db.collection("leads").doc(meeting.leadId).get();
  if (!lead.exists || lead.data()?.empresa_id !== meeting.empresaId) return;
  const current = lead.data()?.data_proximo_passo;
  const currentMs = current instanceof Timestamp ? current.toDate().getTime() : 0;
  const sameSlot = Math.abs(currentMs - meeting.inicio.getTime()) < 60_000;
  if (quando || sameSlot || currentMs === 0) {
    await lead.ref.update({
      proximo_passo: proximoPasso.slice(0, 300),
      data_proximo_passo: quando,
      updated_at: now,
    });
  }
}
