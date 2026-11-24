export interface AgendaConfig {
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
  googleConectado: boolean;
  googleEmail: string;
}

export interface Agendamento {
  id: string;
  empresa_id: string;
  lead_id: string;
  inicio: string;
  fim: string;
  meet_link: string;
  status: "confirmado" | "cancelado" | "remarcado";
  convidado_nome: string;
}

export interface PublicAgenda {
  slug: string;
  titulo: string;
  descricao: string;
  logoUrl: string;
  empresaNome: string;
  duracaoMin: number;
  fuso: string;
  googleConectado: boolean;
}

export interface AgendaDay {
  data: string;
  horarios: string[];
}

export interface BookingConfirmation {
  inicio: string;
  fim: string;
  meetLink: string;
  manageUrl: string;
  titulo: string;
}
