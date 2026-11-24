import { useState, type FormEvent } from "react";
import { ArrowRight, Lock, Mail, MessageSquare } from "lucide-react";

interface LoginScreenProps {
  onSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  onSignUp: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  onEnterDemoMode: () => void;
}

export function LoginScreen({
  onSignIn,
  onSignUp,
  onEnterDemoMode,
}: LoginScreenProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setFeedback({
        type: "error",
        message: "Informe e-mail e senha para continuar.",
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    if (mode === "login") {
      const res = await onSignIn(email, password);
      if (res.error) {
        setFeedback({ type: "error", message: res.error });
      }
    } else {
      const res = await onSignUp(email, password);
      if (res.error) {
        setFeedback({ type: "error", message: res.error });
      } else if (res.needsConfirmation) {
        setFeedback({
          type: "success",
          message:
            "Conta criada! Verifique seu e-mail para confirmar o acesso antes de entrar.",
        });
      }
    }

    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#10152A] flex flex-col justify-between p-6 md:p-10">
      <div className="flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F97316] flex items-center justify-center text-white">
            <MessageSquare className="w-5 h-5" />
          </div>
          <span className="font-display text-lg font-semibold text-white tracking-tight">
            BuildAI Leads
          </span>
        </div>
        <span className="text-xs text-slate-400">
          Fuso horário padrão: America/Sao_Paulo
        </span>
      </div>

      <main className="max-w-5xl w-full mx-auto my-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-6 text-white">
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight leading-tight text-balance">
            Gestão comercial dos leads atendidos pela IA no WhatsApp.
          </h1>
          <p className="text-slate-300 text-base leading-relaxed max-w-lg">
            Acompanhe solicitações de atendimento humano, priorize leads quentes
            sem contato há mais de 24h, mova oportunidades no funil e reanalise
            conversas com Gemini.
          </p>

          <div className="pt-2 grid grid-cols-3 gap-6 border-t border-white/10 max-w-md">
            <div>
              <p className="font-mono text-xl font-semibold text-[#F97316] tabular-nums">
                6 etapas
              </p>
              <p className="text-xs text-slate-400 mt-1">Funil Kanban</p>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold text-white tabular-nums">
                Auth
              </p>
              <p className="text-xs text-slate-400 mt-1">Acesso autenticado</p>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold text-white tabular-nums">
                24h
              </p>
              <p className="text-xs text-slate-400 mt-1">Alerta de retorno</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 shadow-sm max-w-md w-full mx-auto">
            <div className="mb-6">
              <h2 className="font-display text-xl font-semibold text-[#10152A]">
                {mode === "login"
                  ? "Entrar no BuildAI Leads"
                  : "Criar conta de acesso"}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Somente usuários autenticados visualizam e editam leads.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-sm font-medium text-[#10152A] mb-1.5"
                  >
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@buildai.com.br"
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#10152A] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-medium text-[#10152A] mb-1.5"
                  >
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#10152A] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
                    />
                  </div>
                </div>

                {feedback && (
                  <div
                    role="alert"
                    className={`p-3 rounded-lg text-sm border ${
                      feedback.type === "error"
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700"
                    }`}
                  >
                    {feedback.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  <span>
                    {submitting
                      ? "Autenticando..."
                      : mode === "login"
                        ? "Entrar"
                        : "Criar conta"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "login" ? "signup" : "login");
                      setFeedback(null);
                    }}
                    className="text-sm text-slate-600 hover:text-[#10152A] underline underline-offset-4 cursor-pointer"
                  >
                    {mode === "login"
                      ? "Não tem acesso? Criar conta com e-mail"
                      : "Já possui conta? Fazer login"}
                  </button>
                </div>
              </form>

              <button
                type="button"
                onClick={onEnterDemoMode}
                className="mt-4 w-full py-2.5 px-4 rounded-lg border border-slate-300 text-sm font-medium text-[#10152A] hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Explorar com 8 leads de exemplo
              </button>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl w-full mx-auto text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <span>BuildAI · CRM Comercial WhatsApp</span>
        <span>Dados protegidos por autenticação</span>
      </footer>
    </div>
  );
}
