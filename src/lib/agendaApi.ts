import type {
  AgendaDay,
  BookingConfirmation,
  PublicAgenda,
} from "../types/agenda";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/agenda${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("A agenda ainda não está publicada neste ambiente.");
  }
  if (!response.ok) {
    throw new Error(data.error || "Não foi possível falar com a agenda.");
  }
  return data as T;
}

export function fetchPublicAgenda(slug: string): Promise<PublicAgenda> {
  return request(`/${slug}`);
}

export function fetchHorarios(slug: string): Promise<{ duracaoMin: number; dias: AgendaDay[] }> {
  return request(`/${slug}/horarios`);
}

export function confirmHorario(
  slug: string,
  body: {
    inicio: string;
    nome: string;
    telefone: string;
    email: string;
    empresa: string;
    mensagem: string;
    leadId: string;
  },
): Promise<BookingConfirmation> {
  return request(`/${slug}/confirmar`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function manageAgenda<T>(body: Record<string, unknown>): Promise<T> {
  return request("/gerenciar", { method: "POST", body: JSON.stringify(body) });
}

export function googleCalendarUrl(input: {
  title: string;
  start: string;
  end: string;
  details: string;
  location: string;
}): string {
  const stamp = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${stamp(input.start)}/${stamp(input.end)}`,
    details: input.details,
    location: input.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function bookingLink(slug: string, params: { tel?: string; nome?: string; lead?: string }): string {
  const search = new URLSearchParams();
  if (params.tel) search.set("tel", params.tel);
  if (params.nome) search.set("nome", params.nome);
  if (params.lead) search.set("lead", params.lead);
  const query = search.toString();
  return `/agendar/${slug}${query ? `?${query}` : ""}`;
}

