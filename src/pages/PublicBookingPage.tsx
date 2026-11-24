import { useEffect, useMemo, useState } from "react";
import { formatTimeSP } from "../lib/date";
import {
  confirmHorario,
  fetchHorarios,
  fetchPublicAgenda,
  googleCalendarUrl,
} from "../lib/agendaApi";
import type { AgendaDay, BookingConfirmation, PublicAgenda } from "../types/agenda";
import { BookingShell } from "./BookingShell";

interface PublicBookingPageProps {
  slug: string;
}

function dayBits(data: string): { week: string; date: string } {
  const date = new Date(`${data}T12:00:00-03:00`);
  const week = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
  })
    .format(date)
    .replace(".", "");
  const label = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
  return { week, date: label };
}

function readQuery(): { tel: string; nome: string; lead: string } {
  const params = new URLSearchParams(window.location.search);
  return {
    tel: params.get("tel") ?? "",
    nome: params.get("nome") ?? "",
    lead: params.get("lead") ?? "",
  };
}

export function PublicBookingPage({ slug }: PublicBookingPageProps) {
  const prefill = useMemo(readQuery, []);
  const [profile, setProfile] = useState<PublicAgenda | null>(null);
  const [days, setDays] = useState<AgendaDay[]>([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [nome, setNome] = useState(prefill.nome);
  const [telefone, setTelefone] = useState(prefill.tel);
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<BookingConfirmation | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPublicAgenda(slug)
      .then(async (next) => {
        if (cancelled) return;
        setProfile(next);
        if (!next.googleConectado) return;
        const slots = await fetchHorarios(slug);
        if (cancelled) return;
        setDays(slots.dias);
        setSelectedDay(slots.dias[0]?.data ?? "");
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Agenda não encontrada.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const horarios = days.find((day) => day.data === selectedDay)?.horarios ?? [];

  const submit = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await confirmHorario(slug, {
        inicio: selectedSlot,
        nome,
        telefone,
        email,
        empresa,
        mensagem,
        leadId: prefill.lead,
      });
      setDone(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível confirmar.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <BookingShell empresaNome="BuildAI Leads" titulo="Carregando agenda...">
        <p className="text-sm text-slate-500">Buscando horários livres.</p>
      </BookingShell>
    );
  }

  if (!profile) {
    return (
      <BookingShell empresaNome="BuildAI Leads" titulo="Agenda não encontrada">
        <p className="text-sm text-slate-600">{error || "Este link não está ativo."}</p>
      </BookingShell>
    );
  }

  if (done) {
    const when = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(done.inicio));
    return (
      <BookingShell
        empresaNome={profile.empresaNome}
        titulo="Reunião confirmada"
        logoUrl={profile.logoUrl}
      >
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <p className="text-sm text-slate-600">
            {done.titulo} · {profile.duracaoMin} min
          </p>
          <p className="font-display text-2xl font-semibold capitalize">{when}</p>
          <p className="text-xs text-slate-500">Horário de Brasília</p>
          {done.meetLink && (
            <a
              href={done.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm font-semibold text-[#EA580C] break-all"
            >
              {done.meetLink}
            </a>
          )}
          <a
            href={googleCalendarUrl({
              title: done.titulo,
              start: done.inicio,
              end: done.fim,
              details: done.meetLink,
              location: done.meetLink,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex px-4 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold"
          >
            Adicionar ao calendário
          </a>
          <p className="text-xs text-slate-500 break-all">
            Para cancelar ou remarcar, use o link enviado no convite: {done.manageUrl}
          </p>
        </div>
      </BookingShell>
    );
  }

  return (
    <BookingShell
      empresaNome={profile.empresaNome}
      titulo={profile.titulo}
      descricao={profile.descricao}
      logoUrl={profile.logoUrl}
    >
      <div className="space-y-6">
        <p className="text-sm text-slate-500">{profile.duracaoMin} minutos · Horário de Brasília</p>
        {!profile.googleConectado && (
          <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-xl p-4">
            Esta agenda ainda não está conectada ao Google Calendar.
          </p>
        )}
        {profile.googleConectado && days.length === 0 && (
          <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-xl p-4">
            Nenhum horário livre nesta janela.
          </p>
        )}
        {days.length > 0 && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map((day) => {
                const bits = dayBits(day.data);
                const active = day.data === selectedDay;
                return (
                  <button
                    key={day.data}
                    type="button"
                    onClick={() => {
                      setSelectedDay(day.data);
                      setSelectedSlot("");
                    }}
                    className={`shrink-0 w-16 rounded-xl border px-2 py-2 text-center cursor-pointer ${
                      active
                        ? "bg-[#10152A] text-white border-[#10152A]"
                        : "bg-white text-[#10152A] border-slate-200"
                    }`}
                  >
                    <span className="block text-[11px] uppercase">{bits.week}</span>
                    <span className="block text-sm font-semibold">{bits.date}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {horarios.map((iso) => {
                const active = iso === selectedSlot;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedSlot(iso)}
                    className={`rounded-lg border px-2 py-2 text-sm font-medium cursor-pointer ${
                      active
                        ? "bg-[#F97316] text-white border-[#F97316]"
                        : "bg-white text-[#10152A] border-slate-200"
                    }`}
                  >
                    {formatTimeSP(iso)}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {selectedSlot && (
          <form
            className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <p className="text-sm font-semibold">
              {dayBits(selectedDay).date} às {formatTimeSP(selectedSlot)}
            </p>
            <input
              required
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Nome"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              value={telefone}
              onChange={(event) => setTelefone(event.target.value)}
              placeholder="WhatsApp"
              inputMode="tel"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="E-mail"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={empresa}
              onChange={(event) => setEmpresa(event.target.value)}
              placeholder="Empresa"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              value={mensagem}
              onChange={(event) => setMensagem(event.target.value)}
              placeholder="O que você precisa?"
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#10152A] text-white py-2.5 text-sm font-semibold disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "Confirmando..." : "Confirmar reunião"}
            </button>
          </form>
        )}
        {error && <p className="text-sm text-[#EA580C]">{error}</p>}
      </div>
    </BookingShell>
  );
}
