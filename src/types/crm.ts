export type Urgencia = "baixa" | "media" | "alta";
export type Sentimento = "positivo" | "neutro" | "negativo";
export type Origem = "site" | "instagram" | "linkedin" | "indicacao" | "outro";
export type Etapa =
  | "novo"
  | "qualificando"
  | "reuniao_agendada"
  | "proposta"
  | "ganho"
  | "perdido";

export type TipoInteracao =
  | "whatsapp_entrada"
  | "whatsapp_saida"
  | "nota"
  | "ligacao"
  | "reuniao";

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  nome: string;
  telefone: string;
  empresa: string | null;
  segmento: string | null;
  demanda: string | null;
  volume: string | null;
  urgencia: Urgencia;
  sentimento: Sentimento;
  nota: number;
  origem: Origem;
  etapa: Etapa;
  resumo: string | null;
  handoff: boolean;
  proximo_passo: string | null;
  data_proximo_passo: string | null;
  responsavel: string | null;
}

export interface Interacao {
  id: string;
  lead_id: string;
  created_at: string;
  tipo: TipoInteracao;
  conteudo: string;
}

export interface AiLeadSuggestion {
  segmento: string;
  demanda: string;
  urgencia: Urgencia;
  sentimento: Sentimento;
  nota: number;
  resumo: string;
  justificativa: string;
}

export const ETAPAS: Array<{ id: Etapa; label: string; shortLabel: string }> = [
  { id: "novo", label: "Novo", shortLabel: "Novo" },
  { id: "qualificando", label: "Qualificando", shortLabel: "Qualificando" },
  { id: "reuniao_agendada", label: "Reunião Agendada", shortLabel: "Reunião" },
  { id: "proposta", label: "Proposta", shortLabel: "Proposta" },
  { id: "ganho", label: "Ganho", shortLabel: "Ganho" },
  { id: "perdido", label: "Perdido", shortLabel: "Perdido" },
];

export const ETAPA_LABEL: Record<Etapa, string> = {
  novo: "Novo",
  qualificando: "Qualificando",
  reuniao_agendada: "Reunião Agendada",
  proposta: "Proposta",
  ganho: "Ganho",
  perdido: "Perdido",
};

export const URGENCIA_LABEL: Record<Urgencia, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const SENTIMENTO_LABEL: Record<Sentimento, string> = {
  positivo: "Positivo",
  neutro: "Neutro",
  negativo: "Negativo",
};

export const ORIGEM_LABEL: Record<Origem, string> = {
  site: "Site",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  indicacao: "Indicação",
  outro: "Outro",
};

export const TIPO_INTERACAO_LABEL: Record<TipoInteracao, string> = {
  whatsapp_entrada: "WhatsApp (Entrada)",
  whatsapp_saida: "WhatsApp (Saída)",
  nota: "Nota Interna",
  ligacao: "Ligação",
  reuniao: "Reunião",
};

export const CALENDLY_URL = "https://calendly.com/buildaidev/30min";
