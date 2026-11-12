import { useState } from "react";
import { AlertTriangle, Clock, UserCheck } from "lucide-react";
import { formatRelativeTimeSP } from "../lib/date";
import {
  getLastContactAt,
  getScoreTone,
  getSentimentEmoji,
  isHandoffSemResposta,
  isHotLeadStale24h,
} from "../lib/leadHelpers";
import {
  ETAPAS,
  SENTIMENTO_LABEL,
  type Etapa,
  type Interacao,
  type Lead,
} from "../types/crm";

interface KanbanViewProps {
  leads: Lead[];
  interacoesByLead: Record<string, Interacao[]>;
  onMoveStage: (leadId: string, etapa: Etapa) => Promise<string | null>;
  onSelectLead: (leadId: string) => void;
}

export function KanbanView({
  leads,
  interacoesByLead,
  onMoveStage,
  onSelectLead,
}: KanbanViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Etapa | null>(null);

  const handleDrop = async (targetEtapa: Etapa) => {
    setDragOverStage(null);
    if (!draggingId) return;
    const current = leads.find((l) => l.id === draggingId);
    setDraggingId(null);
    if (!current || current.etapa === targetEtapa) return;
    await onMoveStage(current.id, targetEtapa);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#10152A] tracking-tight">
            Funil de Leads
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Arraste os cards entre etapas ou use o seletor rápido em dispositivos
            móveis.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
            Nota ≥ 7
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
            Nota 4–6
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-600" />
            Nota &lt; 4
          </span>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 items-start">
        {ETAPAS.map((col) => {
          const colLeads = leads.filter((l) => l.etapa === col.id);
          const isOver = dragOverStage === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverStage !== col.id) setDragOverStage(col.id);
              }}
              onDragLeave={() => {
                if (dragOverStage === col.id) setDragOverStage(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                void handleDrop(col.id);
              }}
              className={`w-[290px] sm:w-[300px] shrink-0 rounded-xl border transition-colors ${
                isOver
                  ? "bg-orange-50/60 border-[#F97316]"
                  : "bg-slate-100/80 border-slate-200"
              }`}
            >
              <div className="px-3.5 py-3 border-b border-slate-200/80 flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-[#10152A]">
                  {col.label}
                </h2>
                <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums">
                  {colLeads.length}
                </span>
              </div>

              <div className="p-2.5 space-y-2.5 min-h-[260px]">
                {colLeads.length === 0 ? (
                  <div className="py-10 px-3 text-center text-xs text-slate-400">
                    Nenhum lead nesta etapa
                  </div>
                ) : (
                  colLeads.map((lead) => {
                    const ints = interacoesByLead[lead.id] ?? [];
                    const lastContact = getLastContactAt(lead, ints);
                    const scoreTone = getScoreTone(lead.nota);
                    const pendingHandoff = isHandoffSemResposta(lead, ints);
                    const staleHot = isHotLeadStale24h(lead, ints);

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => setDraggingId(lead.id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverStage(null);
                        }}
                        onClick={() => onSelectLead(lead.id)}
                        className={`bg-white rounded-lg border p-3.5 cursor-pointer transition-all hover:border-[#10152A]/40 ${
                          draggingId === lead.id ? "opacity-50" : "opacity-100"
                        } ${
                          pendingHandoff
                            ? "border-[#F97316]"
                            : staleHot
                              ? "border-amber-400"
                              : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-display text-sm font-semibold text-[#10152A] truncate">
                              {lead.nome}
                            </h3>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {lead.segmento || "Segmento não informado"}
                            </p>
                          </div>

                          <span
                            title={`Sentimento: ${SENTIMENTO_LABEL[lead.sentimento]}`}
                            aria-label={`Sentimento ${SENTIMENTO_LABEL[lead.sentimento]}`}
                            className="text-base leading-none shrink-0"
                          >
                            {getSentimentEmoji(lead.sentimento)}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-semibold tabular-nums border ${scoreTone.bgClass} ${scoreTone.textClass} ${scoreTone.borderClass}`}
                          >
                            {lead.nota}/10 · {scoreTone.label}
                          </span>

                          <span className="inline-flex items-center gap-1 text-slate-500 font-mono tabular-nums">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTimeSP(lastContact)}
                          </span>
                        </div>

                        {(pendingHandoff || staleHot) && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                            {pendingHandoff && (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-[#EA580C]">
                                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                                <span>Handoff sem resposta</span>
                              </div>
                            )}
                            {staleHot && (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>Quente &gt;24h sem contato</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Controle rápido de etapa para mobile/acessibilidade */}
                        <div
                          className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label
                            htmlFor={`move-${lead.id}`}
                            className="text-[11px] text-slate-400"
                          >
                            Etapa:
                          </label>
                          <select
                            id={`move-${lead.id}`}
                            value={lead.etapa}
                            onChange={(e) =>
                              void onMoveStage(
                                lead.id,
                                e.target.value as Etapa
                              )
                            }
                            className="text-xs text-[#10152A] bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-[#F97316]"
                          >
                            {ETAPAS.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
