import { useEffect, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Calendar,
  Check,
  ExternalLink,
  MessageCircle,
  Save,
  Send,
  UserCheck,
  X,
} from "lucide-react";
import {
  formatDateTimeSP,
  formatRelativeTimeSP,
  fromDateTimeLocalSP,
  toDateTimeLocalSP,
} from "../lib/date";
import {
  formatPhoneDisplay,
  formatWhatsAppUrl,
  getLastContactAt,
  getScoreTone,
  getSentimentEmoji,
  isHandoffSemResposta,
  isHotLeadStale24h,
} from "../lib/leadHelpers";
import {
  ETAPAS,
  ORIGEM_LABEL,
  SENTIMENTO_LABEL,
  TIPO_INTERACAO_LABEL,
  URGENCIA_LABEL,
  type AiLeadSuggestion,
  type Etapa,
  type Interacao,
  type Lead,
  type Origem,
  type Sentimento,
  type TipoInteracao,
  type Urgencia,
} from "../types/crm";

interface LeadDetailViewProps {
  lead: Lead;
  interacoes: Interacao[];
  bookingUrl: string | null;
  nextMeetingLabel: string | null;
  nextMeetingLink: string | null;
  onConfigureAgenda: () => void;
  onBack: () => void;
  onSaveLead: (leadId: string, patch: Partial<Lead>) => Promise<string | null>;
  onAddInteracao: (
    leadId: string,
    tipo: TipoInteracao,
    conteudo: string
  ) => Promise<string | null>;
}

export function LeadDetailView({
  lead,
  interacoes,
  bookingUrl,
  nextMeetingLabel,
  nextMeetingLink,
  onConfigureAgenda,
  onBack,
  onSaveLead,
  onAddInteracao,
}: LeadDetailViewProps) {
  const [form, setForm] = useState({
    nome: lead.nome,
    telefone: lead.telefone,
    empresa: lead.empresa ?? "",
    segmento: lead.segmento ?? "",
    demanda: lead.demanda ?? "",
    volume: lead.volume ?? "",
    urgencia: lead.urgencia,
    sentimento: lead.sentimento,
    nota: lead.nota,
    origem: lead.origem,
    etapa: lead.etapa,
    resumo: lead.resumo ?? "",
    handoff: lead.handoff,
    proximo_passo: lead.proximo_passo ?? "",
    data_proximo_passo_local: toDateTimeLocalSP(lead.data_proximo_passo),
    responsavel: lead.responsavel ?? "",
  });

  useEffect(() => {
    setForm({
      nome: lead.nome,
      telefone: lead.telefone,
      empresa: lead.empresa ?? "",
      segmento: lead.segmento ?? "",
      demanda: lead.demanda ?? "",
      volume: lead.volume ?? "",
      urgencia: lead.urgencia,
      sentimento: lead.sentimento,
      nota: lead.nota,
      origem: lead.origem,
      etapa: lead.etapa,
      resumo: lead.resumo ?? "",
      handoff: lead.handoff,
      proximo_passo: lead.proximo_passo ?? "",
      data_proximo_passo_local: toDateTimeLocalSP(lead.data_proximo_passo),
      responsavel: lead.responsavel ?? "",
    });
  }, [lead]);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const [newTipo, setNewTipo] = useState<TipoInteracao>("whatsapp_saida");
  const [newConteudo, setNewConteudo] = useState("");
  const [addingInt, setAddingInt] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AiLeadSuggestion | null>(
    null
  );

  const lastContact = getLastContactAt(lead, interacoes);
  const pendingHandoff = isHandoffSemResposta(lead, interacoes);
  const staleHot = isHotLeadStale24h(lead, interacoes);
  const scoreTone = getScoreTone(form.nota);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    const err = await onSaveLead(lead.id, {
      nome: form.nome.trim(),
      telefone: form.telefone.trim(),
      empresa: form.empresa.trim() || null,
      segmento: form.segmento.trim() || null,
      demanda: form.demanda.trim() || null,
      volume: form.volume.trim() || null,
      urgencia: form.urgencia,
      sentimento: form.sentimento,
      nota: Math.max(0, Math.min(10, Math.round(Number(form.nota) || 0))),
      origem: form.origem,
      etapa: form.etapa,
      resumo: form.resumo.trim() || null,
      handoff: form.handoff,
      proximo_passo: form.proximo_passo.trim() || null,
      data_proximo_passo: fromDateTimeLocalSP(form.data_proximo_passo_local),
      responsavel: form.responsavel.trim() || null,
    });
    setSaving(false);
    if (err) {
      setSaveMessage({ type: "err", text: err });
    } else {
      setSaveMessage({
        type: "ok",
        text: "Alterações salvas com sucesso.",
      });
    }
  };

  const handleAddInteracao = async (e: FormEvent) => {
    e.preventDefault();
    if (!newConteudo.trim()) return;
    setAddingInt(true);
    const err = await onAddInteracao(lead.id, newTipo, newConteudo);
    setAddingInt(false);
    if (!err) {
      setNewConteudo("");
    }
  };

  const handleAnalyzeWithAi = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch("/api/analyze-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead: {
            nome: form.nome,
            empresa: form.empresa,
            segmento: form.segmento,
            demanda: form.demanda,
            volume: form.volume,
            urgencia: form.urgencia,
            sentimento: form.sentimento,
            nota: form.nota,
            resumo: form.resumo,
            handoff: form.handoff,
          },
          interacoes: interacoes.map((i) => ({
            tipo: i.tipo,
            conteudo: i.conteudo,
            created_at: i.created_at,
          })),
        }),
      });

      const data = (await response.json()) as {
        suggestion?: AiLeadSuggestion;
        error?: string;
      };
      if (!response.ok || !data.suggestion) {
        throw new Error(data.error || "Falha ao analisar lead com Gemini.");
      }
      setAiSuggestion(data.suggestion);
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "Erro ao analisar conversa."
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplySuggestion = async () => {
    if (!aiSuggestion) return;
    setSaving(true);
    setSaveMessage(null);

    const patch: Partial<Lead> = {
      segmento: aiSuggestion.segmento,
      demanda: aiSuggestion.demanda,
      urgencia: aiSuggestion.urgencia,
      sentimento: aiSuggestion.sentimento,
      nota: aiSuggestion.nota,
      resumo: aiSuggestion.resumo,
    };

    const err = await onSaveLead(lead.id, patch);
    setSaving(false);
    if (err) {
      setSaveMessage({ type: "err", text: err });
      return;
    }

    setForm((prev) => ({
      ...prev,
      segmento: aiSuggestion.segmento,
      demanda: aiSuggestion.demanda,
      urgencia: aiSuggestion.urgencia,
      sentimento: aiSuggestion.sentimento,
      nota: aiSuggestion.nota,
      resumo: aiSuggestion.resumo,
    }));
    setAiSuggestion(null);
    setSaveMessage({
      type: "ok",
      text: "Sugestões da IA aplicadas e salvas.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do detalhe */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-[#10152A] hover:bg-slate-50 cursor-pointer"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl md:text-2xl font-bold text-[#10152A] truncate">
                  {lead.nome}
                </h1>
                <span className="text-lg" aria-hidden="true">
                  {getSentimentEmoji(form.sentimento)}
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-mono text-xs font-semibold tabular-nums border ${scoreTone.bgClass} ${scoreTone.textClass} ${scoreTone.borderClass}`}
                >
                  Nota {form.nota}/10 · {scoreTone.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                {lead.empresa ? `${lead.empresa} · ` : ""}
                {formatPhoneDisplay(lead.telefone)} · Último contato{" "}
                {formatRelativeTimeSP(lastContact)} (
                {formatDateTimeSP(lastContact)})
              </p>
              {nextMeetingLabel && (
                <p className="text-xs font-medium text-[#EA580C] mt-1">
                  Próxima reunião: {nextMeetingLabel}
                  {nextMeetingLink ? (
                    <>
                      {" "}
                      ·{" "}
                      <a href={nextMeetingLink} target="_blank" rel="noopener noreferrer" className="underline">
                        Meet
                      </a>
                    </>
                  ) : null}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAnalyzeWithAi}
              disabled={aiLoading}
              className="px-3.5 py-2 rounded-lg bg-[#10152A] hover:bg-[#1B2342] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors disabled:opacity-60 cursor-pointer"
            >
              <Bot className="w-4 h-4 text-[#F97316]" />
              <span>{aiLoading ? "Analisando..." : "Analisar com IA"}</span>
            </button>

            {bookingUrl ? (
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[#10152A] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <Calendar className="w-4 h-4 text-[#F97316]" />
                <span>Agendar</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            ) : (
              <button
                type="button"
                onClick={onConfigureAgenda}
                className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[#10152A] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-[#F97316]" />
                <span>Configurar agenda</span>
              </button>
            )}

            <a
              href={formatWhatsAppUrl(lead.telefone)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Abrir no WhatsApp</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {(pendingHandoff || staleHot) && (
          <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-100 text-xs">
            {pendingHandoff && (
              <span className="inline-flex items-center gap-1.5 font-medium text-[#EA580C]">
                <UserCheck className="w-4 h-4" />
                Handoff ativo: lead solicitou humano/orçamento e ainda está sem
                resposta.
              </span>
            )}
            {staleHot && (
              <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                <AlertTriangle className="w-4 h-4" />
                Alerta: lead quente (nota ≥ 7) sem contato há mais de 24h.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Painel de Sugestão do Gemini antes de salvar */}
      {aiError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between gap-3"
        >
          <span>{aiError}</span>
          <button
            type="button"
            onClick={() => setAiError(null)}
            className="text-red-700 hover:text-red-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {aiSuggestion && (
        <div className="bg-[#10152A] text-white rounded-xl border border-[#1B2342] p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#F97316]" />
                Sugestão da IA (revise antes de salvar)
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                {aiSuggestion.justificativa}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setAiSuggestion(null)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Descartar</span>
              </button>
              <button
                type="button"
                onClick={() => void handleApplySuggestion()}
                disabled={saving}
                className="px-3.5 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aplicar e Salvar</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#1B2342] rounded-lg p-3 border border-white/10">
              <span className="text-slate-400">Segmento sugerido</span>
              <p className="text-sm font-medium text-white mt-1">
                {aiSuggestion.segmento}
              </p>
            </div>
            <div className="bg-[#1B2342] rounded-lg p-3 border border-white/10">
              <span className="text-slate-400">Urgência sugerida</span>
              <p className="text-sm font-medium text-white mt-1">
                {URGENCIA_LABEL[aiSuggestion.urgencia]}
              </p>
            </div>
            <div className="bg-[#1B2342] rounded-lg p-3 border border-white/10">
              <span className="text-slate-400">Sentimento sugerido</span>
              <p className="text-sm font-medium text-white mt-1">
                {getSentimentEmoji(aiSuggestion.sentimento)}{" "}
                {SENTIMENTO_LABEL[aiSuggestion.sentimento]}
              </p>
            </div>
            <div className="bg-[#1B2342] rounded-lg p-3 border border-white/10">
              <span className="text-slate-400">Nota sugerida</span>
              <p className="text-sm font-mono font-semibold text-[#F97316] mt-1 tabular-nums">
                {aiSuggestion.nota}/10 (atual: {form.nota}/10)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-[#1B2342] rounded-lg p-3 border border-white/10">
              <span className="text-slate-400">Demanda identificada</span>
              <p className="text-sm text-slate-100 mt-1 leading-relaxed">
                {aiSuggestion.demanda}
              </p>
            </div>
            <div className="bg-[#1B2342] rounded-lg p-3 border border-white/10">
              <span className="text-slate-400">Novo resumo executivo</span>
              <p className="text-sm text-slate-100 mt-1 leading-relaxed">
                {aiSuggestion.resumo}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grid principal: Dados editáveis + Linha do tempo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Dados editáveis */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-display text-base font-semibold text-[#10152A]">
              Dados do Lead & Próximo Passo
            </h2>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              Criado em {formatDateTimeSP(lead.created_at)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nome
              </label>
              <input
                type="text"
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Telefone (WhatsApp)
              </label>
              <input
                type="text"
                required
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Empresa
              </label>
              <input
                type="text"
                value={form.empresa}
                onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Segmento
              </label>
              <input
                type="text"
                value={form.segmento}
                onChange={(e) => setForm({ ...form, segmento: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Volume
              </label>
              <input
                type="text"
                value={form.volume}
                onChange={(e) => setForm({ ...form, volume: e.target.value })}
                placeholder="Ex: 80 conversas/dia"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Responsável
              </label>
              <input
                type="text"
                value={form.responsavel}
                onChange={(e) =>
                  setForm({ ...form, responsavel: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#F97316]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Etapa
              </label>
              <select
                value={form.etapa}
                onChange={(e) =>
                  setForm({ ...form, etapa: e.target.value as Etapa })
                }
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#F97316]"
              >
                {ETAPAS.map((et) => (
                  <option key={et.id} value={et.id}>
                    {et.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Origem
              </label>
              <select
                value={form.origem}
                onChange={(e) =>
                  setForm({ ...form, origem: e.target.value as Origem })
                }
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#F97316]"
              >
                {Object.entries(ORIGEM_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Urgência
              </label>
              <select
                value={form.urgencia}
                onChange={(e) =>
                  setForm({ ...form, urgencia: e.target.value as Urgencia })
                }
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#F97316]"
              >
                {Object.entries(URGENCIA_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Sentimento
              </label>
              <select
                value={form.sentimento}
                onChange={(e) =>
                  setForm({ ...form, sentimento: e.target.value as Sentimento })
                }
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#F97316]"
              >
                {Object.entries(SENTIMENTO_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nota (0–10)
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={form.nota}
                onChange={(e) =>
                  setForm({
                    ...form,
                    nota: Math.max(
                      0,
                      Math.min(10, Number(e.target.value) || 0)
                    ),
                  })
                }
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-300 font-mono tabular-nums focus:outline-none focus:border-[#F97316]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Demanda (o que quer resolver)
            </label>
            <textarea
              rows={2}
              value={form.demanda}
              onChange={(e) => setForm({ ...form, demanda: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#F97316]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Resumo da conversa (IA)
            </label>
            <textarea
              rows={3}
              value={form.resumo}
              onChange={(e) => setForm({ ...form, resumo: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#F97316]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Próximo passo
              </label>
              <input
                type="text"
                value={form.proximo_passo}
                onChange={(e) =>
                  setForm({ ...form, proximo_passo: e.target.value })
                }
                placeholder="Ex: Enviar proposta ajustada"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Data do próximo passo (America/Sao_Paulo)
              </label>
              <input
                type="datetime-local"
                value={form.data_proximo_passo_local}
                onChange={(e) =>
                  setForm({
                    ...form,
                    data_proximo_passo_local: e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono focus:outline-none focus:border-[#F97316]"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-[#10152A] cursor-pointer">
            <input
              type="checkbox"
              checked={form.handoff}
              onChange={(e) => setForm({ ...form, handoff: e.target.checked })}
              className="rounded border-slate-300 text-[#F97316] focus:ring-[#F97316]"
            />
            <span>Handoff ativo (pediu atendimento humano / orçamento)</span>
          </label>

          {saveMessage && (
            <div
              className={`p-3 rounded-lg text-xs font-medium border ${
                saveMessage.type === "ok"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {saveMessage.text}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Salvando..." : "Salvar alterações"}</span>
            </button>
          </div>
        </form>

        {/* Linha do tempo das interações */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-display text-base font-semibold text-[#10152A]">
              Linha do tempo de interações
            </h2>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {interacoes.length}{" "}
              {interacoes.length === 1 ? "registro" : "registros"}
            </span>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {interacoes.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                Nenhuma interação registrada ainda.
              </p>
            ) : (
              interacoes.map((item) => {
                const isInbound = item.tipo === "whatsapp_entrada";
                const isOutbound = item.tipo === "whatsapp_saida";

                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-3 text-sm ${
                      isInbound
                        ? "bg-slate-50 border-slate-200"
                        : isOutbound
                          ? "bg-orange-50/50 border-orange-200"
                          : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                      <span
                        className={`font-semibold ${
                          isInbound
                            ? "text-[#10152A]"
                            : isOutbound
                              ? "text-[#EA580C]"
                              : "text-slate-700"
                        }`}
                      >
                        {TIPO_INTERACAO_LABEL[item.tipo]}
                      </span>
                      <span className="font-mono text-slate-400 tabular-nums">
                        {formatDateTimeSP(item.created_at)}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {item.conteudo}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          <form
            onSubmit={handleAddInteracao}
            className="pt-4 border-t border-slate-200 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="tipo-interacao"
                className="text-xs font-medium text-slate-700"
              >
                Registrar nova interação
              </label>
              <select
                id="tipo-interacao"
                value={newTipo}
                onChange={(e) => setNewTipo(e.target.value as TipoInteracao)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#F97316]"
              >
                {Object.entries(TIPO_INTERACAO_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              rows={2}
              value={newConteudo}
              onChange={(e) => setNewConteudo(e.target.value)}
              placeholder="Escreva a mensagem enviada, anotação interna ou resumo da ligação..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#F97316]"
            />

            <button
              type="submit"
              disabled={addingInt || !newConteudo.trim()}
              className="w-full py-2 px-4 rounded-lg bg-[#10152A] hover:bg-[#1B2342] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {addingInt ? "Registrando..." : "Adicionar na linha do tempo"}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
