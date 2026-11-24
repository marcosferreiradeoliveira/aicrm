import { formatDateTimeSP } from "../lib/date";
import type { Agendamento } from "../types/agenda";
import type { Lead } from "../types/crm";

interface AgendaViewProps {
  agendamentos: Agendamento[];
  leads: Lead[];
  error: string | null;
  onSelectLead: (leadId: string) => void;
}

export function AgendaView({ agendamentos, leads, error, onSelectLead }: AgendaViewProps) {
  const leadName = (leadId: string, fallback: string) =>
    leads.find((lead) => lead.id === leadId)?.nome || fallback || "Lead";

  return (
    <section className="max-w-3xl">
      <h1 className="font-display text-2xl font-semibold text-[#10152A]">Agenda</h1>
      <p className="text-sm text-slate-600 mt-1">Próximas reuniões desta empresa.</p>
      {error && (
        <p className="mt-4 text-sm text-[#EA580C] bg-white border border-slate-200 rounded-xl p-4">
          {error}
        </p>
      )}
      {!error && agendamentos.length === 0 && (
        <p className="mt-6 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl p-5">
          Nenhuma reunião confirmada pela página de agendamento.
        </p>
      )}
      <ul className="mt-4 space-y-3">
        {agendamentos.map((item) => (
          <li key={item.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="font-display text-base font-semibold text-[#10152A]">
              {formatDateTimeSP(item.inicio)}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              {leadName(item.lead_id, item.convidado_nome)}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => onSelectLead(item.lead_id)}
                className="text-[#10152A] underline cursor-pointer"
              >
                Abrir lead
              </button>
              {item.meet_link && (
                <a href={item.meet_link} target="_blank" rel="noopener noreferrer" className="text-[#EA580C]">
                  Google Meet
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
