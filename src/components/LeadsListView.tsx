import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  Plus,
  Search,
  UserCheck,
  X,
} from "lucide-react";
import { formatDateTimeSP, formatRelativeTimeSP } from "../lib/date";
import {
  exportLeadsToCsv,
  formatPhoneDisplay,
  getLastContactAt,
  getScoreTone,
  getSentimentEmoji,
  isHandoffSemResposta,
  isHotLeadStale24h,
} from "../lib/leadHelpers";
import {
  ETAPAS,
  ETAPA_LABEL,
  ORIGEM_LABEL,
  SENTIMENTO_LABEL,
  URGENCIA_LABEL,
  type Interacao,
  type Lead,
} from "../types/crm";

interface LeadsListViewProps {
  leads: Lead[];
  interacoesByLead: Record<string, Interacao[]>;
  onSelectLead: (leadId: string) => void;
  onOpenNewLead: () => void;
}

type SortOption =
  | "recentes"
  | "nota_desc"
  | "nota_asc"
  | "contato_antigo"
  | "nome_asc";

export function LeadsListView({
  leads,
  interacoesByLead,
  onSelectLead,
  onOpenNewLead,
}: LeadsListViewProps) {
  const [search, setSearch] = useState("");
  const [etapaFilter, setEtapaFilter] = useState<string>("todos");
  const [segmentoFilter, setSegmentoFilter] = useState<string>("todos");
  const [sentimentoFilter, setSentimentoFilter] = useState<string>("todos");
  const [notaFilter, setNotaFilter] = useState<string>("todos");
  const [origemFilter, setOrigemFilter] = useState<string>("todos");
  const [urgenciaFilter, setUrgenciaFilter] = useState<string>("todos");
  const [sortBy, setSortBy] = useState<SortOption>("recentes");

  const segmentosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) {
      if (l.segmento?.trim()) set.add(l.segmento.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [leads]);

  const hasActiveFilter =
    search.trim() !== "" ||
    etapaFilter !== "todos" ||
    segmentoFilter !== "todos" ||
    sentimentoFilter !== "todos" ||
    notaFilter !== "todos" ||
    origemFilter !== "todos" ||
    urgenciaFilter !== "todos";

  const clearFilters = () => {
    setSearch("");
    setEtapaFilter("todos");
    setSegmentoFilter("todos");
    setSentimentoFilter("todos");
    setNotaFilter("todos");
    setOrigemFilter("todos");
    setUrgenciaFilter("todos");
  };

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = leads.filter((lead) => {
      if (q) {
        const haystack = [
          lead.nome,
          lead.empresa,
          lead.telefone,
          lead.segmento,
          lead.demanda,
          lead.responsavel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (etapaFilter !== "todos" && lead.etapa !== etapaFilter) return false;
      if (
        segmentoFilter !== "todos" &&
        (lead.segmento?.trim() || "") !== segmentoFilter
      ) {
        return false;
      }
      if (sentimentoFilter !== "todos" && lead.sentimento !== sentimentoFilter) {
        return false;
      }
      if (origemFilter !== "todos" && lead.origem !== origemFilter) {
        return false;
      }
      if (urgenciaFilter !== "todos" && lead.urgencia !== urgenciaFilter) {
        return false;
      }

      if (notaFilter === "quente" && lead.nota < 7) return false;
      if (notaFilter === "morno" && (lead.nota < 4 || lead.nota > 6)) {
        return false;
      }
      if (notaFilter === "frio" && lead.nota >= 4) return false;

      return true;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "nota_desc":
          return b.nota - a.nota;
        case "nota_asc":
          return a.nota - b.nota;
        case "nome_asc":
          return a.nome.localeCompare(b.nome, "pt-BR");
        case "contato_antigo": {
          const aTime = new Date(
            getLastContactAt(a, interacoesByLead[a.id] ?? [])
          ).getTime();
          const bTime = new Date(
            getLastContactAt(b, interacoesByLead[b.id] ?? [])
          ).getTime();
          return aTime - bTime;
        }
        case "recentes":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

    return filtered;
  }, [
    leads,
    interacoesByLead,
    search,
    etapaFilter,
    segmentoFilter,
    sentimentoFilter,
    notaFilter,
    origemFilter,
    urgenciaFilter,
    sortBy,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#10152A] tracking-tight">
            Lista de Leads
          </h1>
          <p className="text-sm text-slate-600 mt-0.5 tabular-nums">
            Exibindo {filteredLeads.length} de {leads.length} leads
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportLeadsToCsv(filteredLeads, interacoesByLead)}
            disabled={filteredLeads.length === 0}
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-[#10152A] inline-flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewLead}
            className="px-3.5 py-2 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Lead</span>
          </button>
        </div>
      </div>

      {/* Barra de busca e filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, empresa, telefone, segmento ou demanda..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#F97316]"
            />
          </div>

          <div className="md:col-span-4">
            <select
              aria-label="Ordenar leads"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#F97316]"
            >
              <option value="recentes">Ordenar: Mais recentes</option>
              <option value="nota_desc">Ordenar: Maior nota</option>
              <option value="nota_asc">Ordenar: Menor nota</option>
              <option value="contato_antigo">
                Ordenar: Último contato (mais antigo)
              </option>
              <option value="nome_asc">Ordenar: Nome (A–Z)</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center justify-end">
            {hasActiveFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar filtros</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <select
            aria-label="Filtrar por etapa"
            value={etapaFilter}
            onChange={(e) => setEtapaFilter(e.target.value)}
            className="px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#F97316]"
          >
            <option value="todos">Etapa: Todas</option>
            {ETAPAS.map((et) => (
              <option key={et.id} value={et.id}>
                {et.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por segmento"
            value={segmentoFilter}
            onChange={(e) => setSegmentoFilter(e.target.value)}
            className="px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#F97316]"
          >
            <option value="todos">Segmento: Todos</option>
            {segmentosDisponiveis.map((seg) => (
              <option key={seg} value={seg}>
                {seg}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por sentimento"
            value={sentimentoFilter}
            onChange={(e) => setSentimentoFilter(e.target.value)}
            className="px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#F97316]"
          >
            <option value="todos">Sentimento: Todos</option>
            {Object.entries(SENTIMENTO_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por nota"
            value={notaFilter}
            onChange={(e) => setNotaFilter(e.target.value)}
            className="px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#F97316]"
          >
            <option value="todos">Nota: Todas</option>
            <option value="quente">Quente (7–10)</option>
            <option value="morno">Morno (4–6)</option>
            <option value="frio">Frio (0–3)</option>
          </select>

          <select
            aria-label="Filtrar por origem"
            value={origemFilter}
            onChange={(e) => setOrigemFilter(e.target.value)}
            className="px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#F97316]"
          >
            <option value="todos">Origem: Todas</option>
            {Object.entries(ORIGEM_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por urgência"
            value={urgenciaFilter}
            onChange={(e) => setUrgenciaFilter(e.target.value)}
            className="px-2.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#F97316]"
          >
            <option value="todos">Urgência: Todas</option>
            {Object.entries(URGENCIA_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela desktop + Cards mobile */}
      {filteredLeads.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-sm font-medium text-[#10152A]">
            Nenhum lead encontrado com os filtros selecionados.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Tente limpar os filtros ou cadastrar um novo lead.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600">
                    <th className="py-3 px-4">Lead / Empresa</th>
                    <th className="py-3 px-3">Segmento</th>
                    <th className="py-3 px-3">Etapa</th>
                    <th className="py-3 px-3">Nota</th>
                    <th className="py-3 px-3">Sent.</th>
                    <th className="py-3 px-3">Urgência</th>
                    <th className="py-3 px-3">Origem</th>
                    <th className="py-3 px-3">Último contato</th>
                    <th className="py-3 px-4">Alertas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredLeads.map((lead) => {
                    const ints = interacoesByLead[lead.id] ?? [];
                    const lastContact = getLastContactAt(lead, ints);
                    const scoreTone = getScoreTone(lead.nota);
                    const pendingHandoff = isHandoffSemResposta(lead, ints);
                    const staleHot = isHotLeadStale24h(lead, ints);

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => onSelectLead(lead.id)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#10152A]">
                            {lead.nome}
                          </div>
                          <div className="text-xs text-slate-500 font-mono tabular-nums">
                            {lead.empresa ? `${lead.empresa} · ` : ""}
                            {formatPhoneDisplay(lead.telefone)}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-700">
                          {lead.segmento || "—"}
                        </td>
                        <td className="py-3 px-3 text-xs font-medium text-[#10152A]">
                          {ETAPA_LABEL[lead.etapa]}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-mono text-xs font-semibold tabular-nums border ${scoreTone.bgClass} ${scoreTone.textClass} ${scoreTone.borderClass}`}
                          >
                            {lead.nota}
                          </span>
                        </td>
                        <td
                          className="py-3 px-3 text-base"
                          title={SENTIMENTO_LABEL[lead.sentimento]}
                        >
                          {getSentimentEmoji(lead.sentimento)}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-700">
                          {URGENCIA_LABEL[lead.urgencia]}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-700">
                          {ORIGEM_LABEL[lead.origem]}
                        </td>
                        <td
                          className="py-3 px-3 text-xs font-mono tabular-nums text-slate-600"
                          title={formatDateTimeSP(lastContact)}
                        >
                          {formatRelativeTimeSP(lastContact)}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div className="flex flex-col gap-0.5">
                            {pendingHandoff && (
                              <span className="inline-flex items-center gap-1 font-medium text-[#EA580C]">
                                <UserCheck className="w-3.5 h-3.5" />
                                Handoff
                              </span>
                            )}
                            {staleHot && (
                              <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                &gt;24h
                              </span>
                            )}
                            {!pendingHandoff && !staleHot && (
                              <span className="text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredLeads.map((lead) => {
              const ints = interacoesByLead[lead.id] ?? [];
              const lastContact = getLastContactAt(lead, ints);
              const scoreTone = getScoreTone(lead.nota);
              const pendingHandoff = isHandoffSemResposta(lead, ints);
              const staleHot = isHotLeadStale24h(lead, ints);

              return (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => onSelectLead(lead.id)}
                  className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 space-y-2 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display text-sm font-semibold text-[#10152A] truncate">
                        {lead.nome}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {lead.segmento || "Sem segmento"} ·{" "}
                        {ETAPA_LABEL[lead.etapa]}
                      </p>
                    </div>
                    <span className="text-base">
                      {getSentimentEmoji(lead.sentimento)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-semibold tabular-nums border ${scoreTone.bgClass} ${scoreTone.textClass} ${scoreTone.borderClass}`}
                    >
                      Nota {lead.nota}/10
                    </span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {formatRelativeTimeSP(lastContact)}
                    </span>
                  </div>

                  {(pendingHandoff || staleHot) && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-3 text-xs">
                      {pendingHandoff && (
                        <span className="inline-flex items-center gap-1 font-medium text-[#EA580C]">
                          <UserCheck className="w-3.5 h-3.5" />
                          Handoff sem resposta
                        </span>
                      )}
                      {staleHot && (
                        <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Quente &gt;24h
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
