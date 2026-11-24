export function HomePage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#10152A]">
      <header className="bg-[#10152A] text-white">
        <div className="max-w-3xl mx-auto px-5 py-10">
          <p className="text-sm text-[#F97316] font-semibold">BuildAI Leads</p>
          <h1 className="font-display text-3xl md:text-4xl font-semibold mt-2">
            CRM dos leads que chegam pelo WhatsApp
          </h1>
          <p className="mt-4 text-slate-300 leading-relaxed">
            O BuildAI Leads, também apresentado como AI CRM, organiza os contatos
            captados pelo atendente de IA. A equipe vê o funil, o histórico da
            conversa e as reuniões marcadas. O acesso à base é feito com e-mail e
            senha, só para quem faz parte da empresa.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/app"
              className="px-4 py-2.5 rounded-lg bg-[#F97316] text-white text-sm font-semibold"
            >
              Entrar no CRM
            </a>
            <a
              href="/privacidade"
              className="px-4 py-2.5 rounded-lg border border-white/20 text-sm font-semibold"
            >
              Política de privacidade
            </a>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-8 space-y-6">
        <section>
          <h2 className="font-display text-xl font-semibold">O que o app faz</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Registra leads com nome, telefone, empresa, nota e etapa comercial.
            Mostra quem pediu atendimento humano e quem está sem retorno. A página
            pública de agendamento marca um horário no Google Calendar da empresa,
            com link do Google Meet, e grava a reunião no CRM.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold">Google Calendar</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            A conexão é opcional e só o dono da empresa autoriza. O app consulta
            horários ocupados e cria ou cancela o evento da reunião. Esse acesso
            não é usado para outro fim.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold">Contato</h2>
          <p className="mt-2 text-sm text-slate-600">
            Dúvidas sobre o app ou sobre privacidade:{" "}
            <a className="text-[#EA580C] font-medium" href="mailto:marcosferreira@mobcontent.com.br">
              marcosferreira@mobcontent.com.br
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
