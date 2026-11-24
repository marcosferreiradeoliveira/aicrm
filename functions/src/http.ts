import { onRequest, type Request } from "firebase-functions/v2/https";
import { confirmBooking, listHorarios, manageBooking, publicProfile } from "./booking";
import { ApiError } from "./errors";
import {
  REGION,
  agendaTokenSecret,
  googleClientId,
  oauthClientSecret,
} from "./params";

function clientIp(req: Request): string {
  const header = req.get("x-forwarded-for") ?? "";
  return (header.split(",")[0] || req.ip || "0").trim().slice(0, 80);
}

function agendaPath(req: Request): string {
  const raw = (req.path || "/").split("?")[0];
  const marker = "/api/agenda";
  const at = raw.indexOf(marker);
  const sliced = at >= 0 ? raw.slice(at + marker.length) : raw;
  const trimmed = sliced.replace(/\/+$/, "");
  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function sendError(res: { status: (code: number) => { json: (body: unknown) => void } }, error: unknown) {
  if (error instanceof ApiError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Não foi possível concluir o agendamento." });
}

export const agendaHttp = onRequest(
  {
    region: REGION,
    cors: true,
    invoker: "public",
    timeoutSeconds: 60,
    secrets: [oauthClientSecret, agendaTokenSecret],
  },
  async (req, res) => {
    try {
      const path = agendaPath(req);
      const parts = path.split("/").filter(Boolean);
      const clientId = googleClientId.value();
      const clientSecret = oauthClientSecret.value();
      const tokenSecret = agendaTokenSecret.value();

      if (parts.length === 1 && parts[0] === "gerenciar" && req.method === "POST") {
        const body = (req.body ?? {}) as Record<string, unknown>;
        res.json(await manageBooking(body, clientIp(req), clientId, clientSecret, tokenSecret));
        return;
      }

      const slug = parts[0] ?? "";
      if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug)) {
        res.status(404).json({ error: "Agenda não encontrada." });
        return;
      }

      if (parts.length === 1 && req.method === "GET") {
        res.json(await publicProfile(slug));
        return;
      }
      if (parts.length === 2 && parts[1] === "horarios" && req.method === "GET") {
        res.json(await listHorarios(slug, clientIp(req), clientId, clientSecret));
        return;
      }
      if (parts.length === 2 && parts[1] === "confirmar" && req.method === "POST") {
        const body = (req.body ?? {}) as Record<string, unknown>;
        res.json(
          await confirmBooking(slug, body, clientIp(req), clientId, clientSecret, tokenSecret),
        );
        return;
      }
      res.status(405).json({ error: "Método não disponível." });
    } catch (error) {
      sendError(res, error);
    }
  },
);
