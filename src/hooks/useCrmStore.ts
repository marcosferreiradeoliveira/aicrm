import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { buildExampleSeedData } from "../data/exampleLeads";
import {
  addInteracaoDoc,
  createCompany,
  createLeadDoc,
  deleteExampleDocs,
  fetchAgendaConfig,
  fetchCrmData,
  fetchMembership,
  fetchUpcomingAppointments,
  seedExampleDocs,
  updateLeadDoc,
  type Membership,
} from "../lib/crmDb";
import { auth } from "../lib/firebase";
import { isExampleLead } from "../lib/leadHelpers";
import type { AgendaConfig, Agendamento } from "../types/agenda";
import type {
  CreateLeadInput,
  Etapa,
  Interacao,
  Lead,
  TipoInteracao,
} from "../types/crm";

export type { CreateLeadInput };

const DEMO_STORAGE_KEY = "buildai_leads_demo_v1";
const DEMO_AUTH_KEY = "buildai_leads_demo_auth_v1";

function authErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code: string }).code)
      : "";
  switch (code) {
    case "auth/invalid-email":
      return "E-mail inválido.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-mail ou senha incorretos.";
    case "auth/email-already-in-use":
      return "Já existe uma conta com esse e-mail.";
    case "auth/weak-password":
      return "A senha precisa ter pelo menos 6 caracteres.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Espere um pouco e tente de novo.";
    case "auth/operation-not-allowed":
      return "O login por e-mail ainda não está ativo neste projeto Firebase.";
    default:
      return error instanceof Error
        ? error.message
        : "Não foi possível autenticar.";
  }
}

export function useCrmStore() {
  const [user, setUser] = useState<User | null>(null);
  const [empresa, setEmpresa] = useState<Membership | null>(null);
  const [membershipReady, setMembershipReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [demoSignedIn, setDemoSignedIn] = useState<boolean>(
    () => localStorage.getItem(DEMO_AUTH_KEY) === "1"
  );

  const [leads, setLeads] = useState<Lead[]>([]);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [agendaConfig, setAgendaConfig] = useState<AgendaConfig | null>(null);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDemoMode = demoSignedIn && !user;
  const isAuthenticated = Boolean(user) || demoSignedIn;
  const userEmail = user?.email
    ? user.email
    : isDemoMode
      ? "demo@buildai.com.br (Modo Demonstração)"
      : "";

  const loadDemoFromStorage = useCallback(() => {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          leads: Lead[];
          interacoes: Interacao[];
        };
        if (Array.isArray(parsed.leads) && Array.isArray(parsed.interacoes)) {
          setLeads(
            parsed.leads.map((lead) => ({
              ...lead,
              empresa_id: lead.empresa_id || "demo",
            }))
          );
          setInteracoes(
            parsed.interacoes.map((item) => ({
              ...item,
              empresa_id: item.empresa_id || "demo",
            }))
          );
          return;
        }
      } catch {
        // Recria os dados de exemplo se o cache local estiver inválido.
      }
    }
    const seed = buildExampleSeedData();
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(seed));
    setLeads(seed.leads);
    setInteracoes(seed.interacoes);
  }, []);

  const persistDemoToStorage = useCallback(
    (nextLeads: Lead[], nextInteracoes: Interacao[]) => {
      localStorage.setItem(
        DEMO_STORAGE_KEY,
        JSON.stringify({ leads: nextLeads, interacoes: nextInteracoes })
      );
    },
    []
  );

  const fetchFirestoreData = useCallback(async (empresaId: string) => {
    setDataLoading(true);
    setError(null);
    try {
      const data = await fetchCrmData(empresaId);
      setLeads(data.leads);
      setInteracoes(data.interacoes);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar os leads."
      );
    }
    try {
      const [configResult, upcomingResult] = await Promise.all([
        fetchAgendaConfig(empresaId).then(
          (config) => ({ config, error: null as string | null }),
          (err: unknown) => ({
            config: null,
            error: err instanceof Error ? err.message : "Erro ao carregar a agenda.",
          }),
        ),
        fetchUpcomingAppointments(empresaId).then(
          (items) => ({ items, error: null as string | null }),
          (err: unknown) => ({
            items: [] as Agendamento[],
            error: err instanceof Error ? err.message : "Erro ao carregar a agenda.",
          }),
        ),
      ]);
      setAgendaConfig(configResult.config);
      setAgendamentos(upcomingResult.items);
      setAgendaError(upcomingResult.error ?? configResult.error);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      if (nextUser) {
        localStorage.removeItem(DEMO_AUTH_KEY);
        setDemoSignedIn(false);
      }
    });
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setEmpresa(null);
      setMembershipReady(true);
      if (demoSignedIn) {
        loadDemoFromStorage();
      } else {
        setLeads([]);
        setInteracoes([]);
        setAgendamentos([]);
        setAgendaConfig(null);
        setAgendaError(null);
      }
      return;
    }

    let cancelled = false;
    setMembershipReady(false);
    fetchMembership(user.uid)
      .then((membership) => {
        if (cancelled) return;
        setEmpresa(membership);
        setMembershipReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setEmpresa(null);
        setMembershipReady(true);
        setError(
          err instanceof Error ? err.message : "Erro ao carregar a empresa."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, demoSignedIn, loadDemoFromStorage]);

  useEffect(() => {
    if (authLoading || !membershipReady || !user || !empresa) return;
    void fetchFirestoreData(empresa.empresaId);
  }, [authLoading, membershipReady, user, empresa, fetchFirestoreData]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        return { error: null };
      } catch (err) {
        return { error: authErrorMessage(err) };
      }
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        return { error: null, needsConfirmation: false };
      } catch (err) {
        return { error: authErrorMessage(err), needsConfirmation: false };
      }
    },
    []
  );

  const createCompanyForUser = useCallback(
    async (nome: string) => {
      if (!user) return { error: "Entre na sua conta para criar a empresa." };
      const trimmed = nome.trim();
      if (!trimmed) return { error: "Informe o nome da empresa." };
      try {
        const membership = await createCompany(user.uid, trimmed);
        setEmpresa(membership);
        setMembershipReady(true);
        return { error: null };
      } catch (err) {
        return {
          error:
            err instanceof Error ? err.message : "Não foi possível criar a empresa.",
        };
      }
    },
    [user]
  );

  const enterDemoMode = useCallback(() => {
    localStorage.setItem(DEMO_AUTH_KEY, "1");
    setDemoSignedIn(true);
    loadDemoFromStorage();
  }, [loadDemoFromStorage]);

  const signOut = useCallback(async () => {
    if (user) {
      await firebaseSignOut(auth);
    }
    localStorage.removeItem(DEMO_AUTH_KEY);
    setDemoSignedIn(false);
    setUser(null);
    setLeads([]);
    setInteracoes([]);
    setAgendamentos([]);
    setAgendaConfig(null);
    setAgendaError(null);
  }, [user]);

  const interacoesByLead = useMemo(() => {
    const map: Record<string, Interacao[]> = {};
    for (const item of interacoes) {
      if (!map[item.lead_id]) map[item.lead_id] = [];
      map[item.lead_id].push(item);
    }
    for (const key of Object.keys(map)) {
      map[key].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }
    return map;
  }, [interacoes]);

  const updateLead = useCallback(
    async (leadId: string, patch: Partial<Lead>): Promise<string | null> => {
      const nowIso = new Date().toISOString();
      if (user) {
        if (!empresa) return "Crie sua empresa antes de editar leads.";
        const current = leads.find((lead) => lead.id === leadId);
        if (!current) return "Lead não encontrado.";
        try {
          const next = await updateLeadDoc(leadId, current, patch);
          setLeads((prev) =>
            prev.map((lead) => (lead.id === leadId ? next : lead))
          );
          return null;
        } catch (err) {
          return err instanceof Error ? err.message : "Erro ao atualizar o lead.";
        }
      }

      setLeads((prev) => {
        const next = prev.map((lead) =>
          lead.id === leadId
            ? {
                ...lead,
                ...patch,
                empresa_id: lead.empresa_id,
                updated_at: nowIso,
              }
            : lead
        );
        persistDemoToStorage(next, interacoes);
        return next;
      });
      return null;
    },
    [empresa, interacoes, leads, persistDemoToStorage, user]
  );

  const moveLeadStage = useCallback(
    async (leadId: string, etapa: Etapa) => {
      return updateLead(leadId, { etapa });
    },
    [updateLead]
  );

  const createLead = useCallback(
    async (
      input: CreateLeadInput
    ): Promise<{ lead?: Lead; error?: string }> => {
      if (user) {
        if (!empresa) return { error: "Crie sua empresa antes de adicionar leads." };
        try {
          const created = await createLeadDoc(empresa.empresaId, input);
          setLeads((prev) => [created.lead, ...prev]);
          if (created.interacao) {
            setInteracoes((prev) => [...prev, created.interacao!]);
          }
          return { lead: created.lead };
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : "Erro ao criar o lead.",
          };
        }
      }

      const nowIso = new Date().toISOString();
      const newLead: Lead = {
        id: crypto.randomUUID(),
        empresa_id: "demo",
        created_at: nowIso,
        updated_at: nowIso,
        nome: input.nome.trim(),
        telefone: input.telefone.trim(),
        empresa: input.empresa?.trim() || null,
        segmento: input.segmento?.trim() || null,
        demanda: input.demanda?.trim() || null,
        volume: input.volume?.trim() || null,
        urgencia: input.urgencia,
        sentimento: input.sentimento,
        nota: input.nota,
        origem: input.origem,
        etapa: input.etapa,
        resumo: input.resumo?.trim() || null,
        handoff: input.handoff,
        proximo_passo: input.proximo_passo?.trim() || null,
        data_proximo_passo: input.data_proximo_passo || null,
        responsavel: input.responsavel?.trim() || null,
      };

      const nextLeads = [newLead, ...leads];
      const nextInteracoes = [...interacoes];
      if (input.mensagemInicial?.trim()) {
        nextInteracoes.push({
          id: crypto.randomUUID(),
          empresa_id: "demo",
          lead_id: newLead.id,
          created_at: nowIso,
          tipo: "whatsapp_entrada",
          conteudo: input.mensagemInicial.trim(),
        });
      }

      setLeads(nextLeads);
      setInteracoes(nextInteracoes);
      persistDemoToStorage(nextLeads, nextInteracoes);
      return { lead: newLead };
    },
    [empresa, interacoes, leads, persistDemoToStorage, user]
  );

  const addInteracao = useCallback(
    async (
      leadId: string,
      tipo: TipoInteracao,
      conteudo: string
    ): Promise<string | null> => {
      const text = conteudo.trim();
      if (!text) return "Escreva o conteúdo da interação.";

      if (user) {
        if (!empresa) return "Crie sua empresa antes de registrar interações.";
        try {
          const created = await addInteracaoDoc(empresa.empresaId, leadId, tipo, text);
          setInteracoes((prev) => [...prev, created.interacao]);
          setLeads((prev) =>
            prev.map((lead) =>
              lead.id === leadId
                ? { ...lead, updated_at: created.updatedAt }
                : lead
            )
          );
          return null;
        } catch (err) {
          return err instanceof Error
            ? err.message
            : "Erro ao registrar a interação.";
        }
      }

      const nowIso = new Date().toISOString();
      const newInteracao: Interacao = {
        id: crypto.randomUUID(),
        empresa_id: leads.find((lead) => lead.id === leadId)?.empresa_id ?? "demo",
        lead_id: leadId,
        created_at: nowIso,
        tipo,
        conteudo: text,
      };
      const nextInteracoes = [...interacoes, newInteracao];
      const nextLeads = leads.map((lead) =>
        lead.id === leadId ? { ...lead, updated_at: nowIso } : lead
      );
      setInteracoes(nextInteracoes);
      setLeads(nextLeads);
      persistDemoToStorage(nextLeads, nextInteracoes);
      return null;
    },
    [empresa, interacoes, leads, persistDemoToStorage, user]
  );

  const seedExamples = useCallback(async (): Promise<string | null> => {
    if (user) {
      if (!empresa) return "Crie sua empresa antes de carregar os exemplos.";
      const seed = buildExampleSeedData(empresa.empresaId);
      setDataLoading(true);
      try {
        await seedExampleDocs(empresa.empresaId, seed.leads, seed.interacoes);
        const data = await fetchCrmData(empresa.empresaId);
        setLeads(data.leads);
        setInteracoes(data.interacoes);
        return null;
      } catch (err) {
        return err instanceof Error
          ? err.message
          : "Erro ao inserir os leads de exemplo.";
      } finally {
        setDataLoading(false);
      }
    }

    const seed = buildExampleSeedData("demo");

    setLeads(seed.leads);
    setInteracoes(seed.interacoes);
    persistDemoToStorage(seed.leads, seed.interacoes);
    return null;
  }, [empresa, persistDemoToStorage, user]);

  const clearExamples = useCallback(async (): Promise<string | null> => {
    if (user) {
      if (!empresa) return "Crie sua empresa antes de remover os exemplos.";
      setDataLoading(true);
      try {
        await deleteExampleDocs(empresa.empresaId);
        const data = await fetchCrmData(empresa.empresaId);
        setLeads(data.leads);
        setInteracoes(data.interacoes);
        return null;
      } catch (err) {
        return err instanceof Error
          ? err.message
          : "Erro ao remover os leads de exemplo.";
      } finally {
        setDataLoading(false);
      }
    }

    const nextLeads = leads.filter((lead) => !isExampleLead(lead));
    const remainingIds = new Set(nextLeads.map((lead) => lead.id));
    const nextInteracoes = interacoes.filter((item) =>
      remainingIds.has(item.lead_id)
    );
    setLeads(nextLeads);
    setInteracoes(nextInteracoes);
    persistDemoToStorage(nextLeads, nextInteracoes);
    return null;
  }, [empresa, interacoes, leads, persistDemoToStorage, user]);

  const refreshData = useCallback(() => {
    if (user && empresa) return fetchFirestoreData(empresa.empresaId);
    loadDemoFromStorage();
  }, [empresa, fetchFirestoreData, loadDemoFromStorage, user]);

  return {
    isDemoMode,
    isAuthenticated,
    authLoading,
    membershipReady,
    needsCompany: Boolean(user) && membershipReady && !empresa,
    empresaId: empresa?.empresaId ?? "",
    empresaNome: empresa?.empresaNome ?? "",
    papel: empresa?.papel ?? null,
    userEmail,
    leads,
    interacoes,
    interacoesByLead,
    agendamentos,
    agendaConfig,
    agendaError,
    dataLoading,
    error,
    signInWithEmail,
    signUpWithEmail,
    enterDemoMode,
    createCompanyForUser,
    signOut,
    refreshData,
    updateLead,
    moveLeadStage,
    createLead,
    addInteracao,
    seedExamples,
    clearExamples,
  };
}
