import { ApiError } from "./errors";
import type { Range } from "./slots";

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
}

const cache = new Map<string, { accessToken: string; expiresAt: number }>();

async function readGoogle(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  let body: Record<string, unknown> = {};
  if (text) {
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      body = { error: text.slice(0, 180) };
    }
  }
  if (!response.ok) {
    const code = typeof body.error === "string" ? body.error : "";
    if (code === "invalid_grant") {
      throw new ApiError(
        409,
        "A conexão com o Google Calendar expirou. O dono da empresa precisa conectar de novo.",
      );
    }
    throw new ApiError(502, "O Google Calendar recusou a operação. Tente de novo.");
  }
  return body;
}

export async function exchangeAuthCode(input: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ refreshToken: string; accessToken: string }> {
  const body = new URLSearchParams({
    code: input.code,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await readGoogle(response)) as TokenResponse;
  if (!data.refresh_token || !data.access_token) {
    throw new ApiError(
      409,
      "O Google não devolveu um acesso permanente. Conecte de novo e aceite o calendário.",
    );
  }
  return { refreshToken: data.refresh_token, accessToken: data.access_token };
}

export async function googleEmail(accessToken: string): Promise<string> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await readGoogle(response);
  return typeof data.email === "string" ? data.email : "";
}

async function accessTokenFor(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const cached = cache.get(refreshToken);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.accessToken;
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await readGoogle(response)) as TokenResponse;
  if (!data.access_token) {
    throw new ApiError(502, "Não foi possível renovar o acesso ao Google Calendar.");
  }
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
  cache.set(refreshToken, {
    accessToken: data.access_token,
    expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
  });
  return data.access_token;
}

export async function queryFreeBusy(input: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  timeMin: Date;
  timeMax: Date;
}): Promise<Range[]> {
  const accessToken = await accessTokenFor(
    input.refreshToken,
    input.clientId,
    input.clientSecret,
  );
  const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: input.timeMin.toISOString(),
      timeMax: input.timeMax.toISOString(),
      timeZone: "America/Sao_Paulo",
      items: [{ id: "primary" }],
    }),
  });
  const data = await readGoogle(response);
  const calendars = data.calendars as Record<string, { busy?: Array<{ start?: string; end?: string }> }> | undefined;
  const busy = calendars?.primary?.busy ?? [];
  return busy.flatMap((item) => {
    const start = new Date(item.start ?? "");
    const end = new Date(item.end ?? "");
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    return [{ start, end }];
  });
}

function meetLinkOf(event: Record<string, unknown>): string {
  if (typeof event.hangoutLink === "string" && event.hangoutLink) return event.hangoutLink;
  const conference = event.conferenceData as
    | { entryPoints?: Array<{ entryPointType?: string; uri?: string }> }
    | undefined;
  const video = conference?.entryPoints?.find((item) => item.entryPointType === "video");
  return video?.uri ?? "";
}

async function getEvent(accessToken: string, eventId: string): Promise<Record<string, unknown>> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return readGoogle(response);
}

export async function createMeetEvent(input: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  attendeeEmail: string;
  requestId: string;
}): Promise<{ eventId: string; meetLink: string }> {
  const accessToken = await accessTokenFor(
    input.refreshToken,
    input.clientId,
    input.clientSecret,
  );
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start.toISOString(), timeZone: "America/Sao_Paulo" },
        end: { dateTime: input.end.toISOString(), timeZone: "America/Sao_Paulo" },
        attendees: [{ email: input.attendeeEmail }],
        conferenceData: {
          createRequest: {
            requestId: input.requestId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    },
  );
  let event = await readGoogle(response);
  let meetLink = meetLinkOf(event);
  const eventId = typeof event.id === "string" ? event.id : "";
  if (!eventId) throw new ApiError(502, "O Google Calendar não criou o evento.");
  if (!meetLink) {
    event = await getEvent(accessToken, eventId);
    meetLink = meetLinkOf(event);
  }
  if (!meetLink) {
    await deleteEvent({ ...input, eventId }).catch(() => undefined);
    throw new ApiError(502, "O Google Calendar não gerou o link do Meet.");
  }
  return { eventId, meetLink };
}

export async function patchEvent(input: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  eventId: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
}): Promise<string> {
  const accessToken = await accessTokenFor(
    input.refreshToken,
    input.clientId,
    input.clientSecret,
  );
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(input.eventId)}?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.start.toISOString(), timeZone: "America/Sao_Paulo" },
        end: { dateTime: input.end.toISOString(), timeZone: "America/Sao_Paulo" },
      }),
    },
  );
  const event = await readGoogle(response);
  return meetLinkOf(event);
}

export async function deleteEvent(input: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  eventId: string;
}): Promise<void> {
  const accessToken = await accessTokenFor(
    input.refreshToken,
    input.clientId,
    input.clientSecret,
  );
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(input.eventId)}?sendUpdates=all`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (response.status === 404 || response.status === 410) return;
  if (response.status === 204 || response.ok) return;
  await readGoogle(response);
}
