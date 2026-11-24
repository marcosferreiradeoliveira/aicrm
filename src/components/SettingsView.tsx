import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  callableError,
  saveAgendaConfig,
  startGoogleConnect,
} from "../lib/agendaAdminApi";
import type { AgendaConfig } from "../types/agenda";
import type { Papel } from "../types/crm";

interface SettingsViewProps {
  empresaId: string;
  empresaNome: string;
  papel: Papel | null;
  isDemoMode: boolean;
  agendaConfig: AgendaConfig | null;
  agendaNotice: string | null;
  onSaved: () => void;
}

const DAY_OPTIONS = [
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sáb" },
  { id: 7, label: "Dom" },
];

interface AgendaForm {
  slug: string;
  titulo: string;
  descricao: string;
  logoUrl: string;
  duracaoMin: number;
  dias: number[];
  horaInicio: string;
  horaFim: string;
  intervaloMin: number;
  antecedenciaHoras: number;
  janelaDias: number;
}

function formFrom(config: AgendaConfig | null): AgendaForm {
  const text = (value: string | undefined, fallback: string) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : fallback;
  };
  return {
    slug: config?.slug ?? "",
    titulo: text(config?.titulo, "Conversa de 30 minutos"),
    descricao: config?.descricao ?? "",
    logoUrl: config?.logoUrl ?? "",
    duracaoMin: config?.duracaoMin || 30,
    dias: config?.dias?.length ? config.dias : [1, 2, 3, 4, 5],
    horaInicio: text(config?.horaInicio, "09:00"),
    horaFim: text(config?.horaFim, "18:00"),
    intervaloMin: config?.intervaloMin ?? 0,
    antecedenciaHoras: config?.antecedenciaHoras ?? 4,
    janelaDias: config?.janelaDias || 14,
  };
}

export function SettingsView({
  empresaId,
  empresaNome,
  papel,
  isDemoMode,
  agendaConfig,
  agendaNotice,
  onSaved,
}: SettingsViewProps) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [form, setForm] = useState(() => formFrom(agendaConfig));
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const isOwner = papel === "dono";

  useEffect(() => {
    setForm(formFrom(agendaConfig));
  }, [agendaConfig]);

  const publicUrl = form.slug
    ? `${window.location.origin}/agendar/${form.slug}`
    : "";

  const copyId = async () => {
    if (!empresaId || isDemoMode) return;
    await navigator.clipboard.writeText(empresaId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 2000);
  };

  const save = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      await saveAgendaConfig(form);
      setFeedback("Agenda salva.");
      onSaved();
    } catch (error) {
      setFeedback(callableError(error));
    } finally {
      setSaving(false);
    }
  };

  const connect = async () => {
    setConnecting(true);
    setFeedback(null);
    try {
      const url = await startGoogleConnect();
      window.location.assign(url);
    } catch (error) {
      setFeedback(callableError(error));
      setConnecting(false);
    }
  };

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#10152A]">
          Configurações
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Use o ID da empresa para integrar o atendimento do WhatsApp a esta base.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Empresa
          </p>
          <p className="mt-1 text-base font-semibold text-[#10152A]">
            {isDemoMode ? "Demonstração local" : empresaNome || "Sem nome"}
          </p>
          {!isDemoMode && papel && (
            <p className="text-sm text-slate-600 mt-1">
              Seu papel: {papel === "dono" ? "Dono" : "Membro"}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            ID da empresa
          </p>
          {isDemoMode ? (
            <p className="mt-1 text-sm text-slate-600">
              O modo demonstração não gera um ID real. Entre com uma conta para
              obter o identificador usado na integração do WhatsApp.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <code className="px-3 py-2 rounded-lg bg-slate-100 text-sm text-[#10152A] break-all">
                {empresaId}
              </code>
              <button
                type="button"
                onClick={() => void copyId()}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-[#10152A] inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copiado" : "Copiar ID"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#10152A]">Agenda pública</h2>
          <p className="text-sm text-slate-600 mt-1">
            O link que o WhatsApp envia. O dono da empresa conecta o Google Calendar.
          </p>
        </div>

        {agendaNotice === "conectado" && (
          <p className="text-sm text-emerald-700">Google Calendar conectado.</p>
        )}
        {agendaNotice === "erro" && (
          <p className="text-sm text-[#EA580C]">
            Não foi possível conectar o Google Calendar. Tente de novo.
          </p>
        )}

        {isDemoMode && (
          <p className="text-sm text-slate-600">
            A agenda usa a conta real da empresa. Saia da demonstração para conectar o calendário.
          </p>
        )}

        {!isDemoMode && !isOwner && (
          <p className="text-sm text-slate-600">
            Só o dono da empresa altera a agenda.
            {agendaConfig?.slug && (
              <>
                {" "}
                Link atual:{" "}
                <a className="text-[#EA580C] font-medium" href={`/agendar/${agendaConfig.slug}`}>
                  /agendar/{agendaConfig.slug}
                </a>
              </>
            )}
          </p>
        )}

        {!isDemoMode && isOwner && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void connect()}
                disabled={connecting}
                className="px-4 py-2 rounded-lg bg-[#10152A] text-white text-sm font-semibold disabled:opacity-60 cursor-pointer"
              >
                {connecting
                  ? "Abrindo Google..."
                  : agendaConfig?.googleConectado
                    ? "Reconectar Google Calendar"
                    : "Conectar Google Calendar"}
              </button>
              {agendaConfig?.googleConectado && agendaConfig.googleEmail && (
                <span className="text-sm text-slate-600">Conectado como {agendaConfig.googleEmail}</span>
              )}
            </div>

            <label className="block text-sm">
              <span className="text-slate-600">Link público</span>
              <input
                value={form.slug}
                onChange={(event) =>
                  setForm({ ...form, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
                }
                placeholder="buildai"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            {publicUrl && (
              <div className="flex flex-wrap items-center gap-3">
                <code className="text-xs text-[#10152A] break-all">{publicUrl}</code>
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="text-xs font-semibold text-[#10152A] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {linkCopied ? "Copiado" : "Copiar link"}
                </button>
              </div>
            )}

            <label className="block text-sm">
              <span className="text-slate-600">Título</span>
              <input
                value={form.titulo}
                onChange={(event) => setForm({ ...form, titulo: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Descrição</span>
              <textarea
                value={form.descricao}
                onChange={(event) => setForm({ ...form, descricao: event.target.value })}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Logo (URL https)</span>
              <input
                value={form.logoUrl}
                onChange={(event) => setForm({ ...form, logoUrl: event.target.value })}
                placeholder="https://"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-slate-600">Duração (min)</span>
                <input
                  type="number"
                  min={15}
                  max={180}
                  value={form.duracaoMin}
                  onChange={(event) => setForm({ ...form, duracaoMin: Number(event.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="text-slate-600">Intervalo (min)</span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={form.intervaloMin}
                  onChange={(event) => setForm({ ...form, intervaloMin: Number(event.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="text-slate-600">Antecedência (horas)</span>
                <input
                  type="number"
                  min={0}
                  max={168}
                  value={form.antecedenciaHoras}
                  onChange={(event) =>
                    setForm({ ...form, antecedenciaHoras: Number(event.target.value) })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="text-slate-600">Janela (dias)</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={form.janelaDias}
                  onChange={(event) => setForm({ ...form, janelaDias: Number(event.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="text-slate-600">Das</span>
                <input
                  type="time"
                  value={form.horaInicio}
                  onChange={(event) => setForm({ ...form, horaInicio: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="text-slate-600">Até</span>
                <input
                  type="time"
                  value={form.horaFim}
                  onChange={(event) => setForm({ ...form, horaFim: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            </div>

            <div>
              <p className="text-sm text-slate-600">Dias</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAY_OPTIONS.map((day) => {
                  const active = form.dias.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          dias: active
                            ? current.dias.filter((item) => item !== day.id)
                            : [...current.dias, day.id].sort((a, b) => a - b),
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${
                        active
                          ? "bg-[#10152A] text-white border-[#10152A]"
                          : "bg-white border-slate-300"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-500">Fuso America/Sao_Paulo. Padrão: segunda a sexta, 9h às 18h.</p>
            </div>

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#F97316] text-white text-sm font-semibold disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Salvando..." : "Salvar agenda"}
            </button>
          </>
        )}
        {feedback && <p className="text-sm text-[#10152A]">{feedback}</p>}
      </div>
    </section>
  );
}
