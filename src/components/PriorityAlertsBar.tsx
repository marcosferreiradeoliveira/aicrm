import { AlertTriangle, Clock, ExternalLink, UserCheck } from "lucide-react";
import { formatRelativeTimeSP } from "../lib/date";
import {
  formatWhatsAppUrl,
  getLastContactAt,
  isHandoffSemResposta,
  isHotLeadStale24h,
} from "../lib/leadHelpers";
import type { Interacao, Lead } from "../types/crm";

interface PriorityAlertsBarProps {
  leads: Lead[];
  interacoesByLead: Record<string, Interacao[]>;
  onSelectLead: (leadId: string) => void;
}

export function PriorityAlertsBar({
  leads,
  interacoesByLead,
  onSelectLead,
}: PriorityAlertsBarProps) {
  const handoffPending = leads.filter((l) =>
    isHandoffSemResposta(l, interacoesByLead[l.id] ?? [])
  );
  const hotStale = leads.filter((l) => {
    const ints = interacoesByLead[l.id] ?? [];
    return isHotLeadStale24h(l, ints) && !isHandoffSemResposta(l, ints);
  });

  if (handoffPending.length === 0 && hotStale.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Prioridades de atendimento"
      className="space-y-3 mb-6"
    >
      {handoffPending.length > 0 && (
        <div className="bg-[#10152A] text-white rounded-xl border border-[#1B2342] p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#F97316] flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-display text-sm md:text-base font-semibold text-white">
                  Handoff solicitado e aguardando resposta humana
                </h2>
                <p className="text-xs text-slate-300">
                  {handoffPending.length}{" "}
                  {handoffPending.length === 1
                    ? "lead pediu atendimento humano ou orçamento"
                    : "leads pediram atendimento humano ou orçamento"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {handoffPending.map((lead) => {
              const ints = interacoesByLead[lead.id] ?? [];
              const lastContact = getLastContactAt(lead, ints);
              return (
                <div
                  key={lead.id}
                  className="bg-[#1B2342] border border-white/10 rounded-lg p-3 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => onSelectLead(lead.id)}
                    className="text-left min-w-0 flex-1 cursor-pointer group"
                  >
                    <p className="text-sm font-semibold text-white truncate group-hover:text-[#F97316] transition-colors">
                      {lead.nome}
                    </p>
                    <p className="text-xs text-slate-300 truncate mt-0.5">
                      {lead.segmento || "Sem segmento"} · Nota{" "}
                      <span className="font-mono tabular-nums font-semibold text-[#F97316]">
                        {lead.nota}
                      </span>{" "}
                      · {formatRelativeTimeSP(lastContact)}
                    </p>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={formatWhatsAppUrl(lead.telefone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-md bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-medium inline-flex items-center gap-1 whitespace-nowrap transition-colors"
                    >
                      <span>WhatsApp</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => onSelectLead(lead.id)}
                      className="px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
                    >
                      Abrir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hotStale.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <p className="text-sm text-amber-950">
              <span className="font-semibold">
                Alerta de follow-up ({hotStale.length}):
              </span>{" "}
              {hotStale.length === 1
                ? "lead quente (nota ≥ 7) sem contato há mais de 24h"
                : "leads quentes (nota ≥ 7) sem contato há mais de 24h"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hotStale.map((lead) => {
              const ints = interacoesByLead[lead.id] ?? [];
              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => onSelectLead(lead.id)}
                  className="px-3 py-1.5 rounded-md bg-white border border-amber-300 hover:border-amber-500 text-xs font-medium text-amber-950 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>{lead.nome}</span>
                  <span className="font-mono tabular-nums text-amber-700">
                    ({formatRelativeTimeSP(getLastContactAt(lead, ints))})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
