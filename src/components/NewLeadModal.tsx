import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { CreateLeadInput } from "../types/crm";
import {
  ETAPAS,
  ORIGEM_LABEL,
  SENTIMENTO_LABEL,
  URGENCIA_LABEL,
  type Etapa,
  type Origem,
  type Sentimento,
  type Urgencia,
} from "../types/crm";

interface NewLeadModalProps {
  onClose: () => void;
  onCreate: (
    input: CreateLeadInput
  ) => Promise<{ lead?: unknown; error?: string }>;
}

export function NewLeadModal({ onClose, onCreate }: NewLeadModalProps) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [segmento, setSegmento] = useState("");
  const [volume, setVolume] = useState("");
  const [demanda, setDemanda] = useState("");
  const [urgencia, setUrgencia] = useState<Urgencia>("media");
  const [sentimento, setSentimento] = useState<Sentimento>("neutro");
  const [nota, setNota] = useState<number>(6);
  const [origem, setOrigem] = useState<Origem>("site");
  const [etapa, setEtapa] = useState<Etapa>("novo");
  const [handoff, setHandoff] = useState<boolean>(false);
  const [responsavel, setResponsavel] = useState("");
  const [mensagemInicial, setMensagemInicial] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim()) {
      setError("Nome e telefone (WhatsApp) são obrigatórios.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await onCreate({
      nome,
      telefone,
      empresa,
      segmento,
      volume,
      demanda,
      urgencia,
      sentimento,
      nota,
      origem,
      etapa,
      handoff,
      responsavel,
      mensagemInicial,
    });
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#10152A]/60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-lead-title"
    >
      <div className="bg-white rounded-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2
            id="new-lead-title"
            className="font-display text-lg font-semibold text-[#10152A]"
          >
            Novo Lead
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-2 rounded-lg text-slate-500 hover:text-[#10152A] hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nome *
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Mariana Silva"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                WhatsApp (único) *
              </label>
              <input
                type="text"
                required
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="Ex: 5511999990000"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Empresa
              </label>
              <input
                type="text"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Nome da empresa"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Segmento
              </label>
              <input
                type="text"
                value={segmento}
                onChange={(e) => setSegmento(e.target.value)}
                placeholder="Ex: Saúde & Clínicas"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Volume estimado
              </label>
              <input
                type="text"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
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
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Ex: Marcos Ferreira"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#F97316]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Demanda (o que quer resolver)
            </label>
            <textarea
              rows={2}
              value={demanda}
              onChange={(e) => setDemanda(e.target.value)}
              placeholder="Descreva a dor principal do cliente..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#F97316]"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Etapa
              </label>
              <select
                value={etapa}
                onChange={(e) => setEtapa(e.target.value as Etapa)}
                className="w-full px-2.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#F97316]"
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
                value={origem}
                onChange={(e) => setOrigem(e.target.value as Origem)}
                className="w-full px-2.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#F97316]"
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
                value={urgencia}
                onChange={(e) => setUrgencia(e.target.value as Urgencia)}
                className="w-full px-2.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#F97316]"
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
                value={sentimento}
                onChange={(e) => setSentimento(e.target.value as Sentimento)}
                className="w-full px-2.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-[#F97316]"
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
                value={nota}
                onChange={(e) =>
                  setNota(
                    Math.max(0, Math.min(10, Number(e.target.value) || 0))
                  )
                }
                className="w-full px-2.5 py-2 text-sm rounded-lg border border-slate-300 font-mono tabular-nums focus:outline-none focus:border-[#F97316]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Primeira mensagem no WhatsApp (opcional)
            </label>
            <textarea
              rows={2}
              value={mensagemInicial}
              onChange={(e) => setMensagemInicial(e.target.value)}
              placeholder="Mensagem recebida pelo atendente de IA..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#F97316]"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-[#10152A] cursor-pointer">
            <input
              type="checkbox"
              checked={handoff}
              onChange={(e) => setHandoff(e.target.checked)}
              className="rounded border-slate-300 text-[#F97316] focus:ring-[#F97316]"
            />
            <span>Pediu atendimento humano / orçamento (handoff)</span>
          </label>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "Salvando..." : "Cadastrar Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
