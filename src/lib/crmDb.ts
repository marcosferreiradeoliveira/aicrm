import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import { isExampleLead } from "./leadHelpers";
import type { AgendaConfig, Agendamento } from "../types/agenda";
import type {
  CreateLeadInput,
  Etapa,
  Interacao,
  Lead,
  Origem,
  Sentimento,
  TipoInteracao,
  Urgencia,
} from "../types/crm";

const LEADS = "leads";
const INTERACOES = "interacoes";
const EMPRESAS = "empresas";
const MEMBROS = "membros";

export interface Membership {
  empresaId: string;
  empresaNome: string;
  papel: "dono" | "membro";
}

function asIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "string" && value) return value;
  return new Date().toISOString();
}

function asOptionalIso(value: unknown): string | null {
  if (value == null) return null;
  return asIso(value);
}

function asTimestamp(iso: string): Timestamp {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Data inválida.");
  }
  return Timestamp.fromDate(date);
}

function textOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function firestoreError(err: unknown, fallback: string): Error {
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code: string }).code)
      : "";
  if (code === "permission-denied") {
    return new Error(
      "Sem permissão no Firestore. Confirme o login e publique as regras de segurança."
    );
  }
  if (
    code === "failed-precondition" &&
    err instanceof Error &&
    /index/i.test(err.message)
  ) {
    return new Error(
      "O índice do Firestore ainda está sendo criado. Tente de novo em alguns minutos."
    );
  }
  if (
    code === "not-found" ||
    code === "failed-precondition" ||
    (err instanceof Error && /database|NOT_FOUND/i.test(err.message))
  ) {
    return new Error(
      "O Firestore ainda não está disponível neste projeto. Crie o banco no console do Firebase."
    );
  }
  return new Error(err instanceof Error ? err.message : fallback);
}

function leadFromDoc(id: string, data: DocumentData): Lead {
  return {
    id,
    empresa_id: String(data.empresa_id ?? ""),
    created_at: asIso(data.created_at),
    updated_at: asIso(data.updated_at),
    nome: String(data.nome ?? ""),
    telefone: String(data.telefone ?? ""),
    empresa: textOrNull(data.empresa),
    segmento: textOrNull(data.segmento),
    demanda: textOrNull(data.demanda),
    volume: textOrNull(data.volume),
    urgencia: data.urgencia as Urgencia,
    sentimento: data.sentimento as Sentimento,
    nota: Number(data.nota ?? 0),
    origem: data.origem as Origem,
    etapa: data.etapa as Etapa,
    resumo: textOrNull(data.resumo),
    handoff: Boolean(data.handoff),
    proximo_passo: textOrNull(data.proximo_passo),
    data_proximo_passo: asOptionalIso(data.data_proximo_passo),
    responsavel: textOrNull(data.responsavel),
  };
}

function interacaoFromDoc(id: string, data: DocumentData): Interacao {
  return {
    id,
    empresa_id: String(data.empresa_id ?? ""),
    lead_id: String(data.lead_id ?? ""),
    created_at: asIso(data.created_at),
    tipo: data.tipo as TipoInteracao,
    conteudo: String(data.conteudo ?? ""),
  };
}

function leadFields(input: {
  empresa_id: string;
  nome: string;
  telefone: string;
  empresa?: string | null;
  segmento?: string | null;
  demanda?: string | null;
  volume?: string | null;
  urgencia: Urgencia;
  sentimento: Sentimento;
  nota: number;
  origem: Origem;
  etapa: Etapa;
  resumo?: string | null;
  handoff: boolean;
  proximo_passo?: string | null;
  data_proximo_passo?: string | null;
  responsavel?: string | null;
  created_at: string;
  updated_at: string;
}) {
  return {
    empresa_id: input.empresa_id,
    nome: input.nome.trim(),
    telefone: input.telefone.trim(),
    empresa: textOrNull(input.empresa),
    segmento: textOrNull(input.segmento),
    demanda: textOrNull(input.demanda),
    volume: textOrNull(input.volume),
    urgencia: input.urgencia,
    sentimento: input.sentimento,
    nota: Math.round(input.nota),
    origem: input.origem,
    etapa: input.etapa,
    resumo: textOrNull(input.resumo),
    handoff: input.handoff,
    proximo_passo: textOrNull(input.proximo_passo),
    data_proximo_passo: input.data_proximo_passo
      ? asTimestamp(input.data_proximo_passo)
      : null,
    responsavel: textOrNull(input.responsavel),
    created_at: asTimestamp(input.created_at),
    updated_at: asTimestamp(input.updated_at),
  };
}

export async function fetchMembership(uid: string): Promise<Membership | null> {
  const memberSnap = await getDoc(doc(db, MEMBROS, uid));
  if (!memberSnap.exists()) return null;
  const data = memberSnap.data();
  const empresaId = String(data.empresa_id ?? "");
  const papel = data.papel === "membro" ? "membro" : "dono";
  let empresaNome = "";
  if (empresaId) {
    const empresaSnap = await getDoc(doc(db, EMPRESAS, empresaId));
    if (empresaSnap.exists()) {
      empresaNome = String(empresaSnap.data().nome ?? "");
    }
  }
  return { empresaId, empresaNome, papel };
}

export async function createCompany(
  uid: string,
  nome: string
): Promise<Membership> {
  const trimmed = nome.trim();
  try {
    const empresaRef = await addDoc(collection(db, EMPRESAS), {
      nome: trimmed,
      dono_uid: uid,
      created_at: Timestamp.now(),
    });
    await setDoc(doc(db, MEMBROS, uid), {
      empresa_id: empresaRef.id,
      papel: "dono",
    });
    return { empresaId: empresaRef.id, empresaNome: trimmed, papel: "dono" };
  } catch (err) {
    throw firestoreError(err, "Não foi possível criar a empresa.");
  }
}

export async function fetchCrmData(empresaId: string): Promise<{
  leads: Lead[];
  interacoes: Interacao[];
}> {
  try {
    const [leadsSnap, intSnap] = await Promise.all([
      getDocs(
        query(collection(db, LEADS), where("empresa_id", "==", empresaId))
      ),
      getDocs(
        query(collection(db, INTERACOES), where("empresa_id", "==", empresaId))
      ),
    ]);
    return {
      leads: leadsSnap.docs
        .map((item) => leadFromDoc(item.id, item.data()))
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ),
      interacoes: intSnap.docs.map((item) =>
        interacaoFromDoc(item.id, item.data())
      ),
    };
  } catch (err) {
    throw firestoreError(err, "Erro ao carregar os leads.");
  }
}

export async function createLeadDoc(
  empresaId: string,
  input: CreateLeadInput
): Promise<{ lead: Lead; interacao: Interacao | null }> {
  try {
    const telefone = input.telefone.trim();
    const dup = await getDocs(
      query(
        collection(db, LEADS),
        where("empresa_id", "==", empresaId),
        where("telefone", "==", telefone)
      )
    );
    if (!dup.empty) {
      throw new Error("Já existe um lead com esse telefone.");
    }

    const nowIso = new Date().toISOString();
    const ref = await addDoc(
      collection(db, LEADS),
      leadFields({
        empresa_id: empresaId,
        nome: input.nome,
        telefone,
        empresa: input.empresa,
        segmento: input.segmento,
        demanda: input.demanda,
        volume: input.volume,
        urgencia: input.urgencia,
        sentimento: input.sentimento,
        nota: input.nota,
        origem: input.origem,
        etapa: input.etapa,
        resumo: input.resumo,
        handoff: input.handoff,
        proximo_passo: input.proximo_passo,
        data_proximo_passo: input.data_proximo_passo,
        responsavel: input.responsavel,
        created_at: nowIso,
        updated_at: nowIso,
      })
    );

    let interacao: Interacao | null = null;
    const mensagem = input.mensagemInicial?.trim();
    if (mensagem) {
      const intRef = await addDoc(collection(db, INTERACOES), {
        empresa_id: empresaId,
        lead_id: ref.id,
        tipo: "whatsapp_entrada",
        conteudo: mensagem,
        created_at: asTimestamp(nowIso),
      });
      interacao = {
        id: intRef.id,
        empresa_id: empresaId,
        lead_id: ref.id,
        created_at: nowIso,
        tipo: "whatsapp_entrada",
        conteudo: mensagem,
      };
    }

    return {
      lead: {
        id: ref.id,
        empresa_id: empresaId,
        created_at: nowIso,
        updated_at: nowIso,
        nome: input.nome.trim(),
        telefone,
        empresa: textOrNull(input.empresa),
        segmento: textOrNull(input.segmento),
        demanda: textOrNull(input.demanda),
        volume: textOrNull(input.volume),
        urgencia: input.urgencia,
        sentimento: input.sentimento,
        nota: Math.round(input.nota),
        origem: input.origem,
        etapa: input.etapa,
        resumo: textOrNull(input.resumo),
        handoff: input.handoff,
        proximo_passo: textOrNull(input.proximo_passo),
        data_proximo_passo: input.data_proximo_passo || null,
        responsavel: textOrNull(input.responsavel),
      },
      interacao,
    };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Já existe")) throw err;
    throw firestoreError(err, "Erro ao criar o lead.");
  }
}

export async function updateLeadDoc(
  leadId: string,
  current: Lead,
  patch: Partial<Lead>
): Promise<Lead> {
  try {
    const nowIso = new Date().toISOString();
    const next: Lead = {
      ...current,
      ...patch,
      id: leadId,
      empresa_id: current.empresa_id,
      created_at: current.created_at,
      updated_at: nowIso,
    };
    const fields = leadFields(next);
    const { created_at: _created, ...editable } = fields;
    await updateDoc(doc(db, LEADS, leadId), editable);
    return next;
  } catch (err) {
    throw firestoreError(err, "Erro ao atualizar o lead.");
  }
}

export async function addInteracaoDoc(
  empresaId: string,
  leadId: string,
  tipo: TipoInteracao,
  conteudo: string
): Promise<{ interacao: Interacao; updatedAt: string }> {
  try {
    const nowIso = new Date().toISOString();
    const ref = await addDoc(collection(db, INTERACOES), {
      empresa_id: empresaId,
      lead_id: leadId,
      tipo,
      conteudo,
      created_at: asTimestamp(nowIso),
    });
    await updateDoc(doc(db, LEADS, leadId), {
      updated_at: asTimestamp(nowIso),
    });
    return {
      interacao: {
        id: ref.id,
        empresa_id: empresaId,
        lead_id: leadId,
        created_at: nowIso,
        tipo,
        conteudo,
      },
      updatedAt: nowIso,
    };
  } catch (err) {
    throw firestoreError(err, "Erro ao registrar a interação.");
  }
}

export async function seedExampleDocs(
  empresaId: string,
  leads: Lead[],
  interacoes: Interacao[]
): Promise<void> {
  try {
    const existingLeads = await getDocs(
      query(collection(db, LEADS), where("empresa_id", "==", empresaId))
    );
    const leadIdByPhone = new Map<string, string>();
    for (const item of existingLeads.docs) {
      const telefone = String(item.data().telefone ?? "");
      if (telefone) leadIdByPhone.set(telefone, item.id);
    }

    const existingInts = await getDocs(
      query(collection(db, INTERACOES), where("empresa_id", "==", empresaId))
    );
    const leadsWithInteractions = new Set(
      existingInts.docs.map((item) => String(item.data().lead_id ?? ""))
    );

    for (const lead of leads) {
      let targetId = leadIdByPhone.get(lead.telefone);
      if (!targetId) {
        const ref = await addDoc(
          collection(db, LEADS),
          leadFields({ ...lead, empresa_id: empresaId })
        );
        targetId = ref.id;
        leadIdByPhone.set(lead.telefone, targetId);
      }

      if (leadsWithInteractions.has(targetId)) continue;

      const related = interacoes.filter((item) => item.lead_id === lead.id);
      if (related.length === 0) continue;

      const batch = writeBatch(db);
      for (const item of related) {
        const ref = doc(collection(db, INTERACOES));
        batch.set(ref, {
          empresa_id: empresaId,
          lead_id: targetId,
          tipo: item.tipo,
          conteudo: item.conteudo,
          created_at: asTimestamp(item.created_at),
        });
      }
      await batch.commit();
      leadsWithInteractions.add(targetId);
    }
  } catch (err) {
    throw firestoreError(err, "Erro ao inserir os leads de exemplo.");
  }
}

export async function deleteExampleDocs(empresaId: string): Promise<void> {
  try {
    const [leadsSnap, intsSnap] = await Promise.all([
      getDocs(query(collection(db, LEADS), where("empresa_id", "==", empresaId))),
      getDocs(
        query(collection(db, INTERACOES), where("empresa_id", "==", empresaId))
      ),
    ]);
    const exampleLeadIds = new Set(
      leadsSnap.docs
        .filter((item) =>
          isExampleLead({ nome: String(item.data().nome ?? "") })
        )
        .map((item) => item.id)
    );
    const refs = [
      ...intsSnap.docs
        .filter((item) =>
          exampleLeadIds.has(String(item.data().lead_id ?? ""))
        )
        .map((item) => item.ref),
      ...leadsSnap.docs
        .filter((item) => exampleLeadIds.has(item.id))
        .map((item) => item.ref),
    ];

    for (let index = 0; index < refs.length; index += 400) {
      const batch = writeBatch(db);
      for (const ref of refs.slice(index, index + 400)) {
        batch.delete(ref);
      }
      if (refs.slice(index, index + 400).length > 0) {
        await batch.commit();
      }
    }
  } catch (err) {
    throw firestoreError(err, "Erro ao remover os leads de exemplo.");
  }
}

const AGENDA_CONFIG = "agenda_config";
const AGENDAMENTOS = "agendamentos";

function numberList(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return fallback;
  const days = value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 1 && item <= 7);
  return days.length > 0 ? days : fallback;
}

export function agendaConfigFromDoc(data: DocumentData): AgendaConfig {
  return {
    slug: String(data.slug ?? ""),
    titulo: String(data.titulo ?? ""),
    descricao: String(data.descricao ?? ""),
    logoUrl: String(data.logo_url ?? ""),
    duracaoMin: Number(data.duracao_min ?? 30),
    dias: numberList(data.dias, [1, 2, 3, 4, 5]),
    horaInicio: String(data.hora_inicio ?? "09:00"),
    horaFim: String(data.hora_fim ?? "18:00"),
    intervaloMin: Number(data.intervalo_min ?? 0),
    antecedenciaHoras: Number(data.antecedencia_horas ?? 4),
    janelaDias: Number(data.janela_dias ?? 14),
    googleConectado: data.google_conectado === true,
    googleEmail: String(data.google_email ?? ""),
  };
}

export async function fetchAgendaConfig(empresaId: string): Promise<AgendaConfig | null> {
  const snap = await getDoc(doc(db, AGENDA_CONFIG, empresaId));
  if (!snap.exists()) return null;
  return agendaConfigFromDoc(snap.data());
}

function startOfTodaySaoPaulo(): Date {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${key}T00:00:00-03:00`);
}

export async function fetchUpcomingAppointments(empresaId: string): Promise<Agendamento[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, AGENDAMENTOS),
        where("empresa_id", "==", empresaId),
        where("status", "==", "confirmado"),
        where("inicio", ">=", Timestamp.fromDate(startOfTodaySaoPaulo())),
        orderBy("inicio", "asc"),
      ),
    );
    return snap.docs.map((item) => {
      const data = item.data();
      const status = data.status === "cancelado" || data.status === "remarcado"
        ? data.status
        : "confirmado";
      return {
        id: item.id,
        empresa_id: String(data.empresa_id ?? ""),
        lead_id: String(data.lead_id ?? ""),
        inicio: asIso(data.inicio),
        fim: asIso(data.fim),
        meet_link: String(data.meet_link ?? ""),
        status,
        convidado_nome: String(data.convidado_nome ?? ""),
      };
    });
  } catch (err) {
    throw firestoreError(err, "Erro ao carregar a agenda.");
  }
}
