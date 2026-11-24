export const SAO_PAULO_TZ = "America/Sao_Paulo";

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: SAO_PAULO_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateOnlyFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: SAO_PAULO_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const shortDayFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: SAO_PAULO_TZ,
  day: "2-digit",
  month: "2-digit",
});

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SAO_PAULO_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDateTimeSP(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: SAO_PAULO_TZ,
  hour: "2-digit",
  minute: "2-digit",
});

export function formatTimeSP(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return timeFormatter.format(date);
}

export function formatDateSP(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return dateOnlyFormatter.format(date);
}

export function getDayKeySP(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return dayKeyFormatter.format(d);
}

export function getShortDayLabelSP(date: Date): string {
  return shortDayFormatter.format(date);
}

export function formatRelativeTimeSP(iso: string | null | undefined): string {
  if (!iso) return "sem registro";
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return "sem registro";

  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return "agora";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin}min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "há 1 dia";
  return `há ${diffDays} dias`;
}

/**
 * Converte ISO UTC para string compatível com <input type="datetime-local">
 * no fuso America/Sao_Paulo.
 */
export function toDateTimeLocalSP(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/**
 * Converte string YYYY-MM-DDTHH:mm interpretada no fuso America/Sao_Paulo (-03:00)
 * para ISO UTC.
 */
export function fromDateTimeLocalSP(localValue: string): string | null {
  if (!localValue) return null;
  // America/Sao_Paulo não adota horário de verão atualmente (-03:00 fixo).
  const parsed = new Date(`${localValue}:00-03:00`);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date(localValue);
    return Number.isNaN(fallback.getTime()) ? null : fallback.toISOString();
  }
  return parsed.toISOString();
}
