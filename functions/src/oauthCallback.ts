import { onRequest } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "./admin";
import { ApiError } from "./errors";
import { exchangeAuthCode, googleEmail } from "./google";
import {
  REGION,
  TIMEZONE,
  agendaTokenSecret,
  appUrl,
  googleClientId,
  oauthClientSecret,
  oauthRedirectUri,
} from "./params";
import { readOauthState } from "./tokens";

function failRedirect(res: { redirect: (url: string) => void }, motivo: string) {
  const back = appUrl.value().replace(/\/+$/, "");
  res.redirect(`${back}/app?agenda=erro&motivo=${encodeURIComponent(motivo)}`);
}

export const agendaOauthCallback = onRequest(
  {
    region: REGION,
    invoker: "public",
    timeoutSeconds: 30,
    secrets: [oauthClientSecret, agendaTokenSecret],
  },
  async (req, res) => {
    try {
      if (req.query.error) {
        failRedirect(res, "acesso-negado");
        return;
      }
      const code = String(req.query.code ?? "");
      const state = String(req.query.state ?? "");
      const parsed = readOauthState(agendaTokenSecret.value(), state);
      const clientId = googleClientId.value();
      if (!code || !parsed || !clientId) {
        failRedirect(res, "sessao");
        return;
      }
      const membro = await db.collection("membros").doc(parsed.uid).get();
      const membroData = membro.data();
      if (membroData?.empresa_id !== parsed.empresaId || membroData?.papel !== "dono") {
        failRedirect(res, "permissao");
        return;
      }
      const exchanged = await exchangeAuthCode({
        code,
        clientId,
        clientSecret: oauthClientSecret.value(),
        redirectUri: oauthRedirectUri(),
      });
      const email = await googleEmail(exchanged.accessToken);
      await db.collection("agenda_segredos").doc(parsed.empresaId).set({
        refresh_token: exchanged.refreshToken,
        calendar_id: "primary",
        updated_at: Timestamp.now(),
      });
      await db.collection("agenda_config").doc(parsed.empresaId).set(
        {
          empresa_id: parsed.empresaId,
          google_conectado: true,
          google_email: email,
          fuso: TIMEZONE,
        },
        { merge: true },
      );
      const back = appUrl.value().replace(/\/+$/, "");
      res.redirect(`${back}/app?agenda=conectado`);
    } catch (error) {
      console.error(error instanceof ApiError ? error.message : error);
      failRedirect(res, "google");
    }
  },
);
