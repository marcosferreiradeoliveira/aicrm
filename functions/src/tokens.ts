import { createHmac, timingSafeEqual } from "crypto";

function sign(secret: string, payload: string): string {
  const body = Buffer.from(payload, "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function open(secret: string, token: string): string | null {
  if (token.length < 10 || token.length > 2000) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return Buffer.from(body, "base64url").toString("utf8");
}

export function signOauthState(
  secret: string,
  empresaId: string,
  uid: string,
): string {
  const exp = Math.floor(Date.now() / 1000) + 15 * 60;
  return sign(secret, `oauth|${empresaId}|${uid}|${exp}`);
}

export function readOauthState(
  secret: string,
  token: string,
): { empresaId: string; uid: string } | null {
  const raw = open(secret, token);
  if (!raw) return null;
  const [kind, empresaId, uid, expRaw] = raw.split("|");
  const exp = Number(expRaw);
  if (kind !== "oauth" || !empresaId || !uid || !Number.isFinite(exp)) return null;
  if (exp < Math.floor(Date.now() / 1000)) return null;
  if (empresaId.length > 128 || uid.length > 128) return null;
  return { empresaId, uid };
}

export function signManageToken(secret: string, agendamentoId: string): string {
  const exp = Math.floor(Date.now() / 1000) + 120 * 24 * 60 * 60;
  return sign(secret, `manage|${agendamentoId}|${exp}`);
}

export function readManageToken(
  secret: string,
  token: string,
): { agendamentoId: string } | null {
  const raw = open(secret, token);
  if (!raw) return null;
  const [kind, agendamentoId, expRaw] = raw.split("|");
  const exp = Number(expRaw);
  if (kind !== "manage" || !agendamentoId || !Number.isFinite(exp)) return null;
  if (exp < Math.floor(Date.now() / 1000)) return null;
  if (agendamentoId.length > 128) return null;
  return { agendamentoId };
}
