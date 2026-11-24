import { useState, type FormEvent } from "react";
import { ArrowRight, Building2, MessageSquare } from "lucide-react";

interface CreateCompanyScreenProps {
  userEmail: string;
  onCreate: (nome: string) => Promise<{ error: string | null }>;
  onSignOut: () => void;
}

export function CreateCompanyScreen({
  userEmail,
  onCreate,
  onSignOut,
}: CreateCompanyScreenProps) {
  const [nome, setNome] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!nome.trim()) {
      setError("Informe o nome da empresa.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await onCreate(nome);
    if (result.error) setError(result.error);
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
        <button
          type="button"
          onClick={onSignOut}
          className="text-xs text-slate-300 hover:text-white underline underline-offset-4 cursor-pointer"
        >
          Sair
        </button>
      </div>

      <main className="max-w-md w-full mx-auto my-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-[#FFF7ED] text-[#F97316] flex items-center justify-center mb-4">
            <Building2 className="w-5 h-5" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-[#10152A]">
            Criar minha empresa
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            {userEmail} ainda não pertence a uma empresa. Os leads ficam
            isolados por empresa.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div>
              <label
                htmlFor="empresa-nome"
                className="block text-sm font-medium text-[#10152A] mb-1.5"
              >
                Nome da empresa
              </label>
              <input
                id="empresa-nome"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                maxLength={120}
                required
                placeholder="BuildAI"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#10152A] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-lg text-sm border bg-red-50 border-red-200 text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <span>{submitting ? "Criando..." : "Criar empresa"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      <footer className="max-w-6xl w-full mx-auto text-xs text-slate-400">
        Você entra como dono desta empresa.
      </footer>
    </div>
  );
}
