import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";

const functions = getFunctions(app, "southamerica-east1");

export async function saveAgendaConfig(input: {
  slug: string;
  titulo: string;
  descricao: string;
  logoUrl: string;
  duracaoMin: number;
  dias: number[];
  horaInicio: string;
  horaFim: string;
  intervaloMin: number;
  antecedenciaHoras: number;
  janelaDias: number;
}): Promise<void> {
  const call = httpsCallable<typeof input, { slug: string }>(functions, "agendaSalvarConfig");
  await call(input);
}

export async function startGoogleConnect(): Promise<string> {
  const call = httpsCallable<undefined, { url: string }>(functions, "agendaIniciarOauth");
  const result = await call();
  return result.data.url;
}

export function callableError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message).trim();
    if (message && !/^internal$/i.test(message)) return message;
  }
  return "Não foi possível concluir a operação.";
}
