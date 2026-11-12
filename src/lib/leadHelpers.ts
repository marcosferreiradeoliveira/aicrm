import {
  ETAPA_LABEL,
  ORIGEM_LABEL,
  SENTIMENTO_LABEL,
  URGENCIA_LABEL,
  type Interacao,
  type Lead,
  type Sentimento,
} from "../types/crm";
import { formatDateTimeSP } from "./date";

const HOURS_24_MS = 24 * 60 * 60 * 1000;

export function getLastContactAt(lead: Lead, interacoes: Interacao[]): string {
  if (interacoes.length === 0) {
    return lead.updated_at || lead.created_at;
  }
  let latest = interacoes[0].created_at;
  for (const item of interacoes) {
    if (new Date(item.created_at).getTime() > new Date(latest).getTime()) {
      latest = item.created_at;
    }
  }
  return latest;
}

/**
 * Regra: handoff = true e ainda sem resposta humana após a última mensagem de entrada.
 */
export function isHandoffSemResposta(
  lead: Lead,
  interacoes: Interacao[]
): boolean {
  if (!lead.handoff) return false;
  if (lead.etapa === "ganho" || lead.etapa === "perdido") return false;

  const sorted = [...interacoes].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let lastInboundTime = new Date(lead.created_at).getTime();
  let hasInbound = false;

  for (const item of sorted) {
    if (item.tipo === "whatsapp_entrada") {
      hasInbound = true;
      lastInboundTime = new Date(item.created_at).getTime();
    }
  }

  const outboundTypes = new Set(["whatsapp_saida", "ligacao", "reuniao"]);
  const hasHumanReplyAfterInbound = sorted.some(
    (item) =>
      outboundTypes.has(item.tipo) &&
      new Date(item.created_at).getTime() > lastInboundTime
  );

  if (!hasInbound && sorted.some((i) => outboundTypes.has(i.tipo))) {
    return false;
  }

  return !hasHumanReplyAfterInbound;
}

/**
 * Regra: Alerta para lead quente (nota >= 7) sem contato há mais de 24h.
 */
export function isHotLeadStale24h(
  lead: Lead,
  interacoes: Interacao[]
): boolean {
  if (lead.nota < 7) return false;
  if (lead.etapa === "ganho" || lead.etapa === "perdido") return false;

  const lastContactIso = getLastContactAt(lead, interacoes);
  const diff = Date.now() - new Date(lastContactIso).getTime();
  return diff > HOURS_24_MS;
}

export function getScoreTone(nota: number): {
  textClass: string;
  bgClass: string;
  borderClass: string;
  label: string;
} {
  if (nota < 4) {
    return {
      textClass: "text-red-700",
      bgClass: "bg-red-50",
      borderClass: "border-red-200",
      label: "Frio",
    };
  }
  if (nota <= 6) {
    return {
      textClass: "text-amber-700",
      bgClass: "bg-amber-50",
      borderClass: "border-amber-200",
      label: "Morno",
    };
  }
  return {
    textClass: "text-emerald-700",
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-200",
    label: "Quente",
  };
}

export function getSentimentEmoji(sentimento: Sentimento): string {
  switch (sentimento) {
    case "positivo":
      return "😊";
    case "negativo":
      return "😟";
    default:
      return "😐";
  }
}

export function formatWhatsAppUrl(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  if (!digits) return "https://wa.me/";
  const normalized =
    digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return `https://wa.me/${normalized}`;
}

export function formatPhoneDisplay(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 9);
    const part2 = digits.slice(9);
    return `(${ddd}) ${part1}-${part2}`;
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 8);
    const part2 = digits.slice(8);
    return `(${ddd}) ${part1}-${part2}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return telefone;
}

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function exportLeadsToCsv(
  leads: Lead[],
  interacoesMap: Record<string, Interacao[]>
): void {
  const headers = [
    "ID",
    "Nome",
    "Telefone",
    "Empresa",
    "Segmento",
    "Demanda",
    "Volume",
    "Urgência",
    "Sentimento",
    "Nota",
    "Origem",
    "Etapa",
    "Handoff",
    "Handoff Sem Resposta",
    "Quente >24h",
    "Próximo Passo",
    "Data Próximo Passo (BRT)",
    "Responsável",
    "Último Contato (BRT)",
    "Criado Em (BRT)",
    "Resumo IA",
  ];

  const rows = leads.map((lead) => {
    const ints = interacoesMap[lead.id] ?? [];
    return [
      lead.id,
      lead.nome,
      lead.telefone,
      lead.empresa ?? "",
      lead.segmento ?? "",
      lead.demanda ?? "",
      lead.volume ?? "",
      URGENCIA_LABEL[lead.urgencia],
      SENTIMENTO_LABEL[lead.sentimento],
      lead.nota,
      ORIGEM_LABEL[lead.origem],
      ETAPA_LABEL[lead.etapa],
      lead.handoff ? "Sim" : "Não",
      isHandoffSemResposta(lead, ints) ? "Sim" : "Não",
      isHotLeadStale24h(lead, ints) ? "Sim" : "Não",
      lead.proximo_passo ?? "",
      formatDateTimeSP(lead.data_proximo_passo),
      lead.responsavel ?? "",
      formatDateTimeSP(getLastContactAt(lead, ints)),
      formatDateTimeSP(lead.created_at),
      lead.resumo ?? "",
    ].map(escapeCsvCell);
  });

  const csvContent =
    "\uFEFF" +
    [headers.map(escapeCsvCell).join(","), ...rows.map((r) => r.join(","))].join(
      "\r\n"
    );

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  link.setAttribute("href", url);
  link.setAttribute("download", `buildai-leads-${stamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
