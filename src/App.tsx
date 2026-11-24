import { useState } from "react";
import {
  CalendarDays,
  Database,
  Kanban,
  LayoutDashboard,
  List,
  LogOut,
  Settings,
  Menu,
  MessageSquare,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { AgendaView } from "./components/AgendaView";
import { DashboardView } from "./components/DashboardView";
import { KanbanView } from "./components/KanbanView";
import { LeadDetailView } from "./components/LeadDetailView";
import { LeadsListView } from "./components/LeadsListView";
import { CreateCompanyScreen } from "./components/CreateCompanyScreen";
import { LoginScreen } from "./components/LoginScreen";
import { SettingsView } from "./components/SettingsView";
import { NewLeadModal } from "./components/NewLeadModal";
import { PriorityAlertsBar } from "./components/PriorityAlertsBar";
import { useCrmStore } from "./hooks/useCrmStore";
import { bookingLink } from "./lib/agendaApi";
import { formatDateTimeSP } from "./lib/date";
import { isExampleLead } from "./lib/leadHelpers";

type ActiveTab = "painel" | "funil" | "lista" | "agenda" | "configuracoes";

export default function App() {
  const {
    isDemoMode,
    isAuthenticated,
    authLoading,
    membershipReady,
    needsCompany,
    empresaId,
    empresaNome,
    papel,
    userEmail,
    leads,
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
  } = useCrmStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const flag = new URLSearchParams(window.location.search).get("agenda");
    return flag === "conectado" || flag === "erro" ? "configuracoes" : "painel";
  });
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [seedFeedback, setSeedFeedback] = useState<string | null>(null);

  if (authLoading || (isAuthenticated && !isDemoMode && !membershipReady)) {
    return (
      <div className="min-h-screen bg-[#10152A] flex items-center justify-center text-white text-sm">
        Carregando BuildAI Leads...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onSignIn={signInWithEmail}
        onSignUp={signUpWithEmail}
        onEnterDemoMode={enterDemoMode}
      />
    );
  }

  if (needsCompany) {
    return (
      <CreateCompanyScreen
        userEmail={userEmail}
        onCreate={createCompanyForUser}
        onSignOut={() => void signOut()}
      />
    );
  }

  const selectedLead = selectedLeadId
    ? leads.find((l) => l.id === selectedLeadId) ?? null
    : null;

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSelectedLeadId(null);
    setMobileMenuOpen(false);
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setMobileMenuOpen(false);
  };

  const handleSeedExamples = async () => {
    setSeeding(true);
    setSeedFeedback(null);
    const err = await seedExamples();
    setSeeding(false);
    if (err) {
      setSeedFeedback(err);
    } else {
      setSeedFeedback("8 leads de exemplo carregados com sucesso.");
    }
  };

  const handleClearExamples = async () => {
    setClearing(true);
    setSeedFeedback(null);
    const err = await clearExamples();
    setClearing(false);
    if (err) {
      setSeedFeedback(err);
    } else {
      setSelectedLeadId(null);
      setSeedFeedback("Leads de exemplo removidos.");
    }
  };

  const exampleCount = leads.filter((lead) => isExampleLead(lead)).length;
  const exampleBusy = seeding || clearing;
  const nextMeetingByLead: Record<string, (typeof agendamentos)[number]> = {};
  for (const item of agendamentos) {
    if (!nextMeetingByLead[item.lead_id]) nextMeetingByLead[item.lead_id] = item;
  }
  const agendaNotice = new URLSearchParams(window.location.search).get("agenda");

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: typeof LayoutDashboard;
  }> = [
    { id: "painel", label: "Painel", icon: LayoutDashboard },
    { id: "funil", label: "Funil (Kanban)", icon: Kanban },
    { id: "lista", label: "Lista de Leads", icon: List },
    { id: "agenda", label: "Agenda", icon: CalendarDays },
    { id: "configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-[#10152A] text-white border-r border-[#1B2342]">
        <div className="px-5 h-16 flex items-center gap-3 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-[#F97316] flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-display text-base font-bold tracking-tight whitespace-nowrap">
              BuildAI Leads
            </span>
            {!isDemoMode && empresaNome && (
              <p className="text-[11px] text-slate-400 truncate">{empresaNome}</p>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = !selectedLead && activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 transition-colors cursor-pointer ${
                  active
                    ? "bg-[#F97316] text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setNewLeadOpen(true)}
              className="w-full px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium flex items-center gap-3 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#F97316]" />
              <span>Novo Lead</span>
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          {isDemoMode && (
            <div className="px-3 py-2 rounded-lg bg-[#1B2342] text-[11px] text-slate-300 leading-relaxed">
              Modo demonstração local. Dados marcados com{" "}
              <strong className="text-white">[Exemplo]</strong>.
            </div>
          )}

          <div className="text-xs text-slate-300 truncate" title={userEmail}>
            {userEmail}
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full px-3 py-2 rounded-lg border border-white/15 hover:bg-white/10 text-xs font-medium text-slate-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Top Bar Mobile */}
      <header className="md:hidden sticky top-0 z-30 bg-[#10152A] text-white h-14 px-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#F97316] flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-sm font-bold tracking-tight whitespace-nowrap">
            BuildAI Leads
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setNewLeadOpen(true)}
            className="px-2.5 py-1.5 rounded-md bg-[#F97316] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lead</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Abrir menu"
            className="p-2 rounded-md hover:bg-white/10 cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#10152A] text-white border-b border-white/10 px-4 py-3 space-y-2">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = !selectedLead && activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 ${
                    active
                      ? "bg-[#F97316] text-white"
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-xs text-slate-300">
            <span className="truncate">{userEmail}</span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="px-3 py-1.5 rounded border border-white/20 text-white shrink-0"
            >
              Sair
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        {/* Desktop Context Top Bar */}
        <div className="hidden md:flex h-16 bg-white border-b border-slate-200 px-8 items-center justify-between gap-8">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="font-medium text-[#10152A]">BuildAI Leads</span>
            <span aria-hidden="true">/</span>
            <span>
              {selectedLead
                ? selectedLead.nome
                : navItems.find((i) => i.id === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {!isDemoMode && leads.length === 0 && (
              <button
                type="button"
                onClick={() => void handleSeedExamples()}
                disabled={exampleBusy}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-[#10152A] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                <Database className="w-3.5 h-3.5 text-[#F97316]" />
                <span>
                  {seeding ? "Inserindo..." : "Popular 8 leads de exemplo"}
                </span>
              </button>
            )}

            {exampleCount > 0 && (
              <button
                type="button"
                onClick={() => void handleClearExamples()}
                disabled={exampleBusy}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-[#10152A] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#F97316]" />
                <span>
                  {clearing ? "Removendo..." : "Tirar leads de exemplo"}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => void refreshData()}
              disabled={dataLoading}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-[#10152A] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${dataLoading ? "animate-spin" : ""}`}
              />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        <main className="flex-1 p-4 md:p-8 max-w-[1440px] w-full mx-auto">
          {error && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {seedFeedback && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center justify-between gap-3">
              <span>{seedFeedback}</span>
              <button
                type="button"
                onClick={() => setSeedFeedback(null)}
                className="text-xs font-medium underline cursor-pointer"
              >
                Fechar
              </button>
            </div>
          )}

          {!isDemoMode &&
            !dataLoading &&
            leads.length === 0 &&
            activeTab !== "configuracoes" && (
            <div className="mb-6 bg-white rounded-xl border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold text-[#10152A]">
                  Sua base de leads está vazia
                </h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  Popule 8 leads fictícios marcados como [Exemplo] para testar o
                  painel e o funil imediatamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleSeedExamples()}
                disabled={exampleBusy}
                className="px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
              >
                {seeding ? "Inserindo..." : "Popular 8 leads de exemplo"}
              </button>
            </div>
          )}

          {exampleCount > 0 && activeTab !== "configuracoes" && (
            <div className="md:hidden mb-6 bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                {exampleCount}{" "}
                {exampleCount === 1 ? "lead de exemplo" : "leads de exemplo"} na
                base.
              </p>
              <button
                type="button"
                onClick={() => void handleClearExamples()}
                disabled={exampleBusy}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-[#10152A] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#F97316]" />
                <span>{clearing ? "Removendo..." : "Tirar"}</span>
              </button>
            </div>
          )}

          {!selectedLead && activeTab !== "configuracoes" && (
            <PriorityAlertsBar
              leads={leads}
              interacoesByLead={interacoesByLead}
              onSelectLead={handleSelectLead}
            />
          )}

          {selectedLead ? (
            <LeadDetailView
              lead={selectedLead}
              interacoes={interacoesByLead[selectedLead.id] ?? []}
              bookingUrl={
                agendaConfig?.slug
                  ? bookingLink(agendaConfig.slug, {
                      tel: selectedLead.telefone,
                      nome: selectedLead.nome,
                      lead: selectedLead.id,
                    })
                  : null
              }
              nextMeetingLabel={
                nextMeetingByLead[selectedLead.id]
                  ? formatDateTimeSP(nextMeetingByLead[selectedLead.id].inicio)
                  : null
              }
              nextMeetingLink={nextMeetingByLead[selectedLead.id]?.meet_link || null}
              onConfigureAgenda={() => handleSelectTab("configuracoes")}
              onBack={() => setSelectedLeadId(null)}
              onSaveLead={updateLead}
              onAddInteracao={addInteracao}
            />
          ) : activeTab === "painel" ? (
            <DashboardView
              leads={leads}
              onSelectLead={handleSelectLead}
              onNavigateTab={(t) => handleSelectTab(t)}
            />
          ) : activeTab === "agenda" ? (
            <AgendaView
              agendamentos={agendamentos}
              leads={leads}
              error={agendaError}
              onSelectLead={handleSelectLead}
            />
          ) : activeTab === "configuracoes" ? (
            <SettingsView
              empresaId={empresaId}
              empresaNome={empresaNome}
              papel={papel}
              isDemoMode={isDemoMode}
              agendaConfig={agendaConfig}
              agendaNotice={agendaNotice}
              onSaved={() => void refreshData()}
            />
          ) : activeTab === "funil" ? (
            <KanbanView
              leads={leads}
              interacoesByLead={interacoesByLead}
              nextMeetingByLead={nextMeetingByLead}
              onMoveStage={moveLeadStage}
              onSelectLead={handleSelectLead}
            />
          ) : (
            <LeadsListView
              leads={leads}
              interacoesByLead={interacoesByLead}
              nextMeetingByLead={nextMeetingByLead}
              onSelectLead={handleSelectLead}
              onOpenNewLead={() => setNewLeadOpen(true)}
            />
          )}
        </main>
      </div>

      {newLeadOpen && (
        <NewLeadModal
          onClose={() => setNewLeadOpen(false)}
          onCreate={createLead}
        />
      )}
    </div>
  );
}
