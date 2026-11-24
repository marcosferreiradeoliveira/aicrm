import { defineSecret, defineString } from "firebase-functions/params";

export const REGION = "southamerica-east1";
export const PROJECT_ID = "aicrm-7246d";
export const TIMEZONE = "America/Sao_Paulo";

export const googleClientId = defineString("GOOGLE_OAUTH_CLIENT_ID", {
  default: "",
});

export const appUrl = defineString("APP_URL", {
  default: "https://buildaicrm.web.app",
});

export const oauthClientSecret = defineSecret("GOOGLE_OAUTH_CLIENT_SECRET");
export const agendaTokenSecret = defineSecret("AGENDA_TOKEN_SECRET");

export function oauthRedirectUri(): string {
  const project =
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    PROJECT_ID;
  return `https://${REGION}-${project}.cloudfunctions.net/agendaOauthCallback`;
}

export const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/userinfo.email",
];
