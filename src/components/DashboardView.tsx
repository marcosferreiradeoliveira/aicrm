import { useMemo, useState } from "react";
import { CalendarCheck, Flame, TrendingUp, Users } from "lucide-react";
import { getDayKeySP, getShortDayLabelSP } from "../lib/date";
import { getSentimentEmoji } from "../lib/leadHelpers";
import { ETAPAS, type Lead, type Sentimento } from "../types/crm";

interface DashboardViewProps {
  leads: Lead[];
  onSelectLead: (leadId: string) => void;
  onNavigateTab: (tab: "funil" | "lista") => void;
}

export function DashboardView({
  leads,
  onSelectLead,
  onNavigateTab,
}: DashboardViewProps) {
  const [hoveredDayKey, setHoveredDayKey] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    const leadsDaSemana = leads.filter(
      (l) => now - new Date(l.created_at).getTime() <= sevenDaysMs
    ).length;

    const leadsQuentes = leads.filter(
      (l) => l.nota >= 7 && l.etapa !== "perdido"
    ).length;

    const reunioesAgendadas = leads.filter(
      (l) => l.etapa === "reuniao_agendada"
    ).length;

    const ganhos = leads.filter((l) => l.etapa === "ganho").length;
    const taxaConversaoGeral =
      leads.length > 0 ? Math.round((ganhos / leads.length) * 100) : 0;

    // Conversão por etapa
    const stageStats = ETAPAS.map((etapa) => {
      const count = leads.filter((l) => l.etapa === etapa.id).length;
      const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
      return {
        ...etapa,
        count,
        pct,
      };
    });

    // Leads por dia (últimos 7 dias no fuso America/Sao_Paulo)
    const days: Array<{ key: string; label: string; count: number }> = [];
    const countsByDay: Record<string, number> = {};
    for (const lead of leads) {
      const key = getDayKeySP(lead.created_at);
      countsByDay[key] = (countsByDay[key] ?? 0) + 1;
    }

    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(now - offset * 24 * 60 * 60 * 1000);
      const key = getDayKeySP(d);
      days.push({
        key,
        label: getShortDayLabelSP(d),
        count: countsByDay[key] ?? 0,
      });
    }

    // Distribuição de sentimento
    const sentimentBase: Array<{
      id: Sentimento;
      label: string;
      count: number;
      barClass: string;
    }> = [
      {
        id: "positivo",
        label: "Positivo",
        count: leads.filter((l) => l.sentimento === "positivo").length,
        barClass: "bg-emerald-600",
      },
      {
        id: "neutro",
        label: "Neutro",
        count: leads.filter((l) => l.sentimento === "neutro").length,
        barClass: "bg-slate-400",
      },
      {
        id: "negativo",
        label: "Negativo",
        count: leads.filter((l) => l.sentimento === "negativo").length,
        barClass: "bg-red-600",
      },
    ];
    const sentiments = sentimentBase.map((s) => ({
      ...s,
      pct: leads.length > 0 ? Math.round((s.count / leads.length) * 100) : 0,
    }));

    // Top segmentos
    const segMap: Record<
      string,
      { segmento: string; count: number; totalNota: number }
    > = {};
    for (const lead of leads) {
      const seg = lead.segmento?.trim() || "Não informado";
      if (!segMap[seg]) {
        segMap[seg] = { segmento: seg, count: 0, totalNota: 0 };
      }
      segMap[seg].count += 1;
      segMap[seg].totalNota += lead.nota;
    }
    const topSegmentos = Object.values(segMap)
      .map((s) => ({
        segmento: s.segmento,
        count: s.count,
        mediaNota: (s.totalNota / s.count).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      leadsDaSemana,
      leadsQuentes,
      reunioesAgendadas,
      ganhos,
      taxaConversaoGeral,
      stageStats,
      days,
      sentiments,
      topSegmentos,
    };
  }, [leads]);

  const maxDayCount = Math.max(1, ...metrics.days.map((d) => d.count));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#10152A] tracking-tight">
            Painel Comercial
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Visão geral dos leads captados pelo atendente de IA no WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab("funil")}
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-[#10152A] transition-colors whitespace-nowrap cursor-pointer"
          >
            Abrir Funil
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab("lista")}
            className="px-3.5 py-2 rounded-lg bg-[#10152A] hover:bg-[#1B2342] text-white text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
          >
            Ver Lista Completa
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Leads da semana</span>
            <Users className="w-4 h-4 text-[#10152A]" />
          </div>
          <p className="font-display text-3xl font-bold text-[#10152A] mt-2 tabular-nums">
            {metrics.leadsDaSemana}
          </p>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            Total na base: {leads.length}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Leads quentes (nota ≥ 7)</span>
            <Flame className="w-4 h-4 text-[#F97316]" />
          </div>
          <p className="font-display text-3xl font-bold text-[#10152A] mt-2 tabular-nums">
            {metrics.leadsQuentes}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Ativos com alta intenção
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Reuniões agendadas</span>
            <CalendarCheck className="w-4 h-4 text-[#10152A]" />
          </div>
          <p className="font-display text-3xl font-bold text-[#10152A] mt-2 tabular-nums">
            {metrics.reunioesAgendadas}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Na etapa Reunião Agendada
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Taxa de fechamento</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-display text-3xl font-bold text-[#10152A] mt-2 tabular-nums">
            {metrics.taxaConversaoGeral}%
          </p>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            {metrics.ganhos}{" "}
            {metrics.ganhos === 1 ? "lead ganho" : "leads ganhos"}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Leads por dia */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-[#10152A]">
                Leads por dia
              </h2>
              <p className="text-xs text-slate-500">
                Últimos 7 dias (America/Sao_Paulo)
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              Máx: {maxDayCount}/dia
            </span>
          </div>

          <div className="h-52 flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2 border-b border-slate-200">
            {metrics.days.map((day) => {
              const heightPct = Math.round((day.count / maxDayCount) * 100);
              const isHovered = hoveredDayKey === day.key;
              return (
                <div
                  key={day.key}
                  onMouseEnter={() => setHoveredDayKey(day.key)}
                  onMouseLeave={() => setHoveredDayKey(null)}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                >
                  <span
                    className={`text-xs font-mono tabular-nums mb-1.5 transition-colors ${
                      day.count > 0
                        ? "text-[#10152A] font-semibold"
                        : "text-slate-400"
                    }`}
                  >
                    {day.count}
                  </span>
                  <div className="w-full max-w-[44px] h-32 flex items-end">
                    <div
                      style={{
                        height: day.count === 0 ? "4px" : `${Math.max(12, heightPct)}%`,
                      }}
                      className={`w-full rounded-t-md transition-colors ${
                        day.count === 0
                          ? "bg-slate-200"
                          : isHovered
                            ? "bg-[#EA580C]"
                            : "bg-[#F97316]"
                      }`}
                      title={`${day.label}: ${day.count} leads`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2 sm:gap-4 pt-2">
            {metrics.days.map((day) => (
              <div
                key={day.key}
                className="flex-1 text-center text-xs font-mono text-slate-500 tabular-nums"
              >
                {day.label}
              </div>
            ))}
          </div>
        </div>

        {/* Taxa de conversão por etapa */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5">
          <div className="mb-4">
            <h2 className="font-display text-base font-semibold text-[#10152A]">
              Distribuição e conversão por etapa
            </h2>
            <p className="text-xs text-slate-500">
              Participação de cada etapa sobre o total de leads
            </p>
          </div>

          <div className="space-y-3">
            {metrics.stageStats.map((stage) => {
              const barColor =
                stage.id === "ganho"
                  ? "bg-emerald-600"
                  : stage.id === "perdido"
                    ? "bg-red-500"
                    : stage.id === "proposta" || stage.id === "reuniao_agendada"
                      ? "bg-[#F97316]"
                      : "bg-[#10152A]";
              return (
                <div key={stage.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#10152A]">
                      {stage.label}
                    </span>
                    <span className="font-mono tabular-nums text-slate-600">
                      {stage.count} ({stage.pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${stage.pct}%` }}
                      className={`h-full rounded-full ${barColor}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Sentimento & Top Segmentos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-display text-base font-semibold text-[#10152A]">
            Distribuição de sentimento
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Tom percebido nas interações via WhatsApp
          </p>

          <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex mb-5">
            {metrics.sentiments.map((s) =>
              s.pct > 0 ? (
                <div
                  key={s.id}
                  style={{ width: `${s.pct}%` }}
                  className={s.barClass}
                  title={`${s.label}: ${s.pct}%`}
                />
              ) : null
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {metrics.sentiments.map((s) => (
              <div
                key={s.id}
                className="py-2.5 flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden="true">{getSentimentEmoji(s.id)}</span>
                  <span className="font-medium text-[#10152A]">{s.label}</span>
                </div>
                <div className="font-mono text-xs tabular-nums text-slate-600">
                  {s.count} leads · {s.pct}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-[#10152A]">
                Top segmentos
              </h2>
              <p className="text-xs text-slate-500">
                Segmentos com maior volume e nota média de qualificação
              </p>
            </div>
          </div>

          {metrics.topSegmentos.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              Nenhum segmento registrado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2 font-medium">Segmento</th>
                    <th className="py-2 font-medium text-right">Leads</th>
                    <th className="py-2 font-medium text-right">Nota média</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {metrics.topSegmentos.map((seg) => (
                    <tr key={seg.segmento} className="hover:bg-slate-50">
                      <td className="py-2.5 font-medium text-[#10152A]">
                        {seg.segmento}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-slate-700">
                        {seg.count}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-[#10152A]">
                        {seg.mediaNota}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {leads.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Último lead recebido: {leads[0]?.nome}</span>
              <button
                type="button"
                onClick={() => leads[0] && onSelectLead(leads[0].id)}
                className="font-medium text-[#F97316] hover:text-[#EA580C] cursor-pointer"
              >
                Abrir detalhe →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
