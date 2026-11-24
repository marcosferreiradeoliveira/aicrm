import { TIMEZONE } from "./params";

export interface Range {
  start: Date;
  end: Date;
}

export interface AgendaHours {
  duracaoMin: number;
  dias: number[];
  horaInicio: string;
  horaFim: string;
  intervaloMin: number;
  antecedenciaHoras: number;
  janelaDias: number;
}

const WEEKDAY: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export function dateKeyInSP(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDaysKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days, 15, 0, 0));
  return dateKeyInSP(utc);
}

function weekdayOfKey(dateKey: string): number {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
  }).format(new Date(`${dateKey}T12:00:00-03:00`));
  return WEEKDAY[label] ?? 0;
}

function minutes(hour: string): number {
  const [h, m] = hour.split(":").map(Number);
  return h * 60 + m;
}

function atMinutes(dateKey: string, totalMinutes: number): Date {
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const mm = String(totalMinutes % 60).padStart(2, "0");
  return new Date(`${dateKey}T${hh}:${mm}:00-03:00`);
}

function overlaps(start: Date, end: Date, busy: Range[]): boolean {
  const a = start.getTime();
  const b = end.getTime();
  return busy.some((item) => a < item.end.getTime() && b > item.start.getTime());
}

export function buildSlots(
  config: AgendaHours,
  busy: Range[],
  now = new Date(),
): Array<{ data: string; horarios: string[] }> {
  const earliest = now.getTime() + config.antecedenciaHoras * 60 * 60 * 1000;
  const startMinutes = minutes(config.horaInicio);
  const endMinutes = minutes(config.horaFim);
  const step = config.duracaoMin + config.intervaloMin;
  const today = dateKeyInSP(now);
  const days: Array<{ data: string; horarios: string[] }> = [];

  for (let offset = 0; offset < config.janelaDias; offset += 1) {
    const data = addDaysKey(today, offset);
    if (!config.dias.includes(weekdayOfKey(data))) continue;
    const horarios: string[] = [];
    for (
      let cursor = startMinutes;
      cursor + config.duracaoMin <= endMinutes;
      cursor += step
    ) {
      const start = atMinutes(data, cursor);
      const end = new Date(start.getTime() + config.duracaoMin * 60 * 1000);
      if (start.getTime() < earliest) continue;
      if (overlaps(start, end, busy)) continue;
      horarios.push(start.toISOString());
    }
    if (horarios.length > 0) days.push({ data, horarios });
    if (days.reduce((sum, day) => sum + day.horarios.length, 0) >= 500) break;
  }

  return days;
}

export function slotExists(
  config: AgendaHours,
  busy: Range[],
  inicio: Date,
  now = new Date(),
): boolean {
  const target = inicio.getTime();
  return buildSlots(config, busy, now).some((day) =>
    day.horarios.some((iso) => new Date(iso).getTime() === target),
  );
}

export function formatMeetingLabel(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
