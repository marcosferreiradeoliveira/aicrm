import { ApiError } from "./errors";

export const ETAPAS = [
  "novo",
  "qualificando",
  "reuniao_agendada",
  "proposta",
  "ganho",
  "perdido",
] as const;

export const URGENCIAS = ["baixa", "media", "alta"] as const;
export const SENTIMENTOS = ["positivo", "neutro", "negativo"] as const;
export const ORIGENS = [
  "site",
  "instagram",
  "linkedin",
  "indicacao",
  "meta_ads",
  "outro",
] as const;

export type Etapa = (typeof ETAPAS)[number];
export type Urgencia = (typeof URGENCIAS)[number];
export type Sentimento = (typeof SENTIMENTOS)[number];
export type Origem = (typeof ORIGENS)[number];

const RESERVED_SLUGS = new Set(["gerenciar", "api", "admin", "agenda"]);

export function assertEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  throw new ApiError(500, `Valor inválido em ${label}.`);
}

export function origemMantida(value: unknown): Origem {
  if (typeof value === "string" && (ORIGENS as readonly string[]).includes(value)) {
    return value as Origem;
  }
  return "site";
}

export function normalizeSlug(value: unknown): string {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug) || RESERVED_SLUGS.has(slug)) {
    throw new ApiError(
      400,
      "O link público precisa ter 3 a 40 caracteres: letras, números e hífen.",
    );
  }
  return slug;
}

export function normalizePhone(value: unknown): string {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.length < 8 || digits.length > 32) {
    throw new ApiError(400, "Informe um WhatsApp válido, com DDD.");
  }
  return digits;
}

export function phoneLookupVariants(phone: string): string[] {
  const variants = new Set<string>([phone]);
  if (phone.startsWith("55") && phone.length > 11) variants.add(phone.slice(2));
  return [...variants];
}

export function normalizeEmail(value: unknown): string {
  const email = String(value ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    throw new ApiError(400, "Informe um e-mail válido.");
  }
  return email;
}

export function clipText(value: unknown, max: number): string {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text.length <= max ? text : text.slice(0, max);
}

export function requireText(value: unknown, max: number, label: string): string {
  const text = clipText(value, max + 1);
  if (text.length < 1 || text.length > max) {
    throw new ApiError(400, `Preencha ${label}.`);
  }
  return text.slice(0, max);
}

export function parseHour(value: unknown, label: string): string {
  const hour = String(value ?? "").trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hour)) {
    throw new ApiError(400, `${label} precisa estar no formato HH:MM.`);
  }
  return hour;
}

export function minutesOf(hour: string): number {
  const [h, m] = hour.split(":").map(Number);
  return h * 60 + m;
}

export function normalizeDias(value: unknown): number[] {
  if (!Array.isArray(value)) {
    throw new ApiError(400, "Escolha pelo menos um dia de atendimento.");
  }
  const dias = [...new Set(value.map((item) => Number(item)))]
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    .sort((a, b) => a - b);
  if (dias.length === 0) {
    throw new ApiError(400, "Escolha pelo menos um dia de atendimento.");
  }
  return dias;
}

export function intInRange(value: unknown, min: number, max: number, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new ApiError(400, `${label} precisa ser um número entre ${min} e ${max}.`);
  }
  return parsed;
}

export function optionalHttpsUrl(value: unknown): string {
  const url = String(value ?? "").trim();
  if (!url) return "";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ApiError(400, "O logo precisa ser um endereço https.");
  }
  if (parsed.protocol !== "https:" || url.length > 500) {
    throw new ApiError(400, "O logo precisa ser um endereço https.");
  }
  return url;
}

export function parseInicio(value: unknown): Date {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "Escolha um horário da lista.");
  }
  return date;
}
