import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { buildExampleSeedData } from "../data/exampleLeads";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type {
  Etapa,
  Interacao,
  Lead,
  Origem,
  Sentimento,
  TipoInteracao,
  Urgencia,
} from "../types/crm";

const DEMO_STORAGE_KEY = "buildai_leads_demo_v1";
const DEMO_AUTH_KEY = "buildai_leads_demo_auth_v1";

export interface CreateLeadInput {
  nome: string;
  telefone: string;
  empresa?: string;
  segmento?: string;
  demanda?: string;
  volume?: string;
  urgencia: Urgencia;
  sentimento: Sentimento;
  nota: number;
  origem: Origem;
  etapa: Etapa;
  resumo?: string;
  handoff: boolean;
  proximo_passo?: string;
  data_proximo_passo?: string | null;
  responsavel?: string;
  mensagemInicial?: string;
}

export function useCrmStore() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [demoSignedIn, setDemoSignedIn] = useState<boolean>(() => {
    if (isSupabaseConfigured) return false;
    return localStorage.getItem(DEMO_AUTH_KEY) === "1";
  });

  const [leads, setLeads] = useState<Lead[]>([]);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = isSupabaseConfigured ? Boolean(session) : demoSignedIn;
  const userEmail = isSupabaseConfigured
    ? session?.user?.email ?? ""
    : demoSignedIn
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
          setLeads(parsed.leads);
          setInteracoes(parsed.interacoes);
          return;
        }
      } catch {
        // Fallback para recriar dados de exemplo
      }
    }
    const seed = buildExampleSeedData();
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(seed));
    setLeads(seed.leads);
    setInteracoes(seed.interacoes);
  }, []);

  const persistDemoToStorage = useCallback(
    (nextLeads: Lead[], nextInteracoes: Interacao[]) => {
      if (!isSupabaseConfigured) {
        localStorage.setItem(
          DEMO_STORAGE_KEY,
          JSON.stringify({ leads: nextLeads, interacoes: nextInteracoes })
        );
      }
    },
    []
  );

  const fetchSupabaseData = useCallback(async () => {
    if (!supabase) return;
    setDataLoading(true);
    setError(null);
    try {
      const [leadsRes, intRes] = await Promise.all([
        supabase
          .from("leads")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("interacoes")
          .select("*")
          .order("created_at", { ascending: true }),
      ]);

      if (leadsRes.error) throw leadsRes.error;
      if (intRes.error) throw intRes.error;

      setLeads((leadsRes.data ?? []) as Lead[]);
      setInteracoes((intRes.data ?? []) as Interacao[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar dados do Supabase."
      );
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      if (demoSignedIn) {
        loadDemoFromStorage();
      }
      return;
    }

    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session ?? null);
        setAuthLoading(false);
      })
      .catch(() => {
        if (mounted) setAuthLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [demoSignedIn, loadDemoFromStorage]);

  useEffect(() => {
    if (isSupabaseConfigured && session) {
      void fetchSupabaseData();
    } else if (!isSupabaseConfigured && demoSignedIn) {
      loadDemoFromStorage();
    } else {
      setLeads([]);
      setInteracoes([]);
    }
  }, [session, demoSignedIn, fetchSupabaseData, loadDemoFromStorage]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        return { error: "Supabase não configurado neste ambiente." };
      }
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return { error: authError ? authError.message : null };
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        return {
          error: "Supabase não configurado neste ambiente.",
          needsConfirmation: false,
        };
      }
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (authError) {
        return { error: authError.message, needsConfirmation: false };
      }
      const needsConfirmation = !data.session;
      return { error: null, needsConfirmation };
    },
    []
  );

  const enterDemoMode = useCallback(() => {
    localStorage.setItem(DEMO_AUTH_KEY, "1");
    setDemoSignedIn(true);
    loadDemoFromStorage();
  }, [loadDemoFromStorage]);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
      setSession(null);
    } else {
      localStorage.removeItem(DEMO_AUTH_KEY);
      setDemoSignedIn(false);
    }
    setLeads([]);
    setInteracoes([]);
  }, []);

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
      if (isSupabaseConfigured && supabase) {
        const { data, error: upError } = await supabase
          .from("leads")
          .update({ ...patch, updated_at: nowIso })
          .eq("id", leadId)
          .select()
          .single();

        if (upError) return upError.message;
        if (data) {
          setLeads((prev) =>
            prev.map((l) => (l.id === leadId ? (data as Lead) : l))
          );
        }
        return null;
      }

      setLeads((prev) => {
        const next = prev.map((l) =>
          l.id === leadId ? { ...l, ...patch, updated_at: nowIso } : l
        );
        persistDemoToStorage(next, interacoes);
        return next;
      });
      return null;
    },
    [interacoes, persistDemoToStorage]
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
      const nowIso = new Date().toISOString();
      const payload = {
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

      if (isSupabaseConfigured && supabase) {
        const { data: created, error: insertError } = await supabase
          .from("leads")
          .insert(payload)
          .select()
          .single();

        if (insertError) {
          return { error: insertError.message };
        }
        const lead = created as Lead;
        let createdInteracao: Interacao | null = null;

        if (input.mensagemInicial?.trim()) {
          const { data: intData } = await supabase
            .from("interacoes")
            .insert({
              lead_id: lead.id,
              tipo: "whatsapp_entrada",
              conteudo: input.mensagemInicial.trim(),
            })
            .select()
            .single();
          if (intData) createdInteracao = intData as Interacao;
        }

        setLeads((prev) => [lead, ...prev]);
        if (createdInteracao) {
          setInteracoes((prev) => [...prev, createdInteracao!]);
        }
        return { lead };
      }

      const newLead: Lead = {
        id: crypto.randomUUID(),
        created_at: nowIso,
        updated_at: nowIso,
        ...payload,
      };

      const nextLeads = [newLead, ...leads];
      const nextInteracoes = [...interacoes];
      if (input.mensagemInicial?.trim()) {
        nextInteracoes.push({
          id: crypto.randomUUID(),
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
    [interacoes, leads, persistDemoToStorage]
  );

  const addInteracao = useCallback(
    async (
      leadId: string,
      tipo: TipoInteracao,
      conteudo: string
    ): Promise<string | null> => {
      const text = conteudo.trim();
      if (!text) return "Escreva o conteúdo da interação.";

      const nowIso = new Date().toISOString();

      if (isSupabaseConfigured && supabase) {
        const { data, error: insError } = await supabase
          .from("interacoes")
          .insert({
            lead_id: leadId,
            tipo,
            conteudo: text,
          })
          .select()
          .single();

        if (insError) return insError.message;

        await supabase
          .from("leads")
          .update({ updated_at: nowIso })
          .eq("id", leadId);

        if (data) {
          setInteracoes((prev) => [...prev, data as Interacao]);
        }
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId ? { ...l, updated_at: nowIso } : l
          )
        );
        return null;
      }

      const newInteracao: Interacao = {
        id: crypto.randomUUID(),
        lead_id: leadId,
        created_at: nowIso,
        tipo,
        conteudo: text,
      };
      const nextInteracoes = [...interacoes, newInteracao];
      const nextLeads = leads.map((l) =>
        l.id === leadId ? { ...l, updated_at: nowIso } : l
      );
      setInteracoes(nextInteracoes);
      setLeads(nextLeads);
      persistDemoToStorage(nextLeads, nextInteracoes);
      return null;
    },
    [interacoes, leads, persistDemoToStorage]
  );

  const seedExamples = useCallback(async (): Promise<string | null> => {
    const seed = buildExampleSeedData();
    if (isSupabaseConfigured && supabase) {
      setDataLoading(true);
      try {
        for (const lead of seed.leads) {
          const { id: oldId, ...restLead } = lead;
          const { data: insertedLead, error: leadErr } = await supabase
            .from("leads")
            .upsert(restLead, { onConflict: "telefone" })
            .select()
            .single();

          if (leadErr) throw leadErr;
          const targetId = (insertedLead as Lead).id;

          const relatedInts = seed.interacoes
            .filter((i) => i.lead_id === oldId)
            .map(({ id: _intId, lead_id: _oldLeadId, ...restInt }) => ({
              ...restInt,
              lead_id: targetId,
            }));

          if (relatedInts.length > 0) {
            const { data: existingInts } = await supabase
              .from("interacoes")
              .select("id")
              .eq("lead_id", targetId)
              .limit(1);

            if (!existingInts || existingInts.length === 0) {
              const { error: intErr } = await supabase
                .from("interacoes")
                .insert(relatedInts);
              if (intErr) throw intErr;
            }
          }
        }
        await fetchSupabaseData();
        return null;
      } catch (err) {
        return err instanceof Error
          ? err.message
          : "Erro ao inserir leads de exemplo no Supabase.";
      } finally {
        setDataLoading(false);
      }
    }

    setLeads(seed.leads);
    setInteracoes(seed.interacoes);
    persistDemoToStorage(seed.leads, seed.interacoes);
    return null;
  }, [fetchSupabaseData, persistDemoToStorage]);

  return {
    isSupabaseConfigured,
    isAuthenticated,
    authLoading,
    userEmail,
    leads,
    interacoes,
    interacoesByLead,
    dataLoading,
    error,
    signInWithEmail,
    signUpWithEmail,
    enterDemoMode,
    signOut,
    refreshData: isSupabaseConfigured ? fetchSupabaseData : loadDemoFromStorage,
    updateLead,
    moveLeadStage,
    createLead,
    addInteracao,
    seedExamples,
  };
}
