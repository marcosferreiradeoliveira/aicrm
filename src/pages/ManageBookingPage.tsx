import { useEffect, useState } from "react";
import { formatDateTimeSP, formatTimeSP } from "../lib/date";
import { googleCalendarUrl, manageAgenda } from "../lib/agendaApi";
import type { AgendaDay } from "../types/agenda";
import { BookingShell } from "./BookingShell";

interface MeetingDetail {
  titulo: string;
  inicio: string;
  fim: string;
  meetLink: string;
  status: string;
  nome: string;
  duracaoMin: number;
  slug: string;
}

function dayBits(data: string): { week: string; date: string } {
  const date = new Date(`${data}T12:00:00-03:00`);
  return {
    week: new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
    })
      .format(date)
      .replace(".", ""),
    date: new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
    }).format(date),
  };
}

export function ManageBookingPage() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [detail, setDetail] = useState<MeetingDetail | null>(null);
  const [days, setDays] = useState<AgendaDay[]>([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [mode, setMode] = useState<"ver" | "remarcar" | "feito">("ver");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Link incompleto.");
      return;
    }
    let cancelled = false;
    manageAgenda<MeetingDetail>({ token, acao: "detalhe" })
      .then((next) => {
        if (!cancelled) setDetail(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Link inválido.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const openReschedule = async () => {
    setBusy(true);
    setError(null);
    try {
      const slots = await manageAgenda<{ dias: AgendaDay[] }>({ token, acao: "horarios" });
      setDays(slots.dias);
      setSelectedDay(slots.dias[0]?.data ?? "");
      setMode("remarcar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os horários.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await manageAgenda({ token, acao: "cancelar" });
      setDetail((current) => (current ? { ...current, status: "cancelado" } : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cancelar.");
    } finally {
      setBusy(false);
    }
  };

  const reschedule = async () => {
    if (!selectedSlot) return;
    setBusy(true);
    setError(null);
    try {
      const next = await manageAgenda<{ inicio: string; fim: string; meetLink: string }>({
        token,
        acao: "remarcar",
        inicio: selectedSlot,
      });
      setDetail((current) =>
        current
          ? { ...current, inicio: next.inicio, fim: next.fim, meetLink: next.meetLink, status: "confirmado" }
          : current,
      );
      setMode("feito");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remarcar.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <BookingShell empresaNome="BuildAI Leads" titulo="Carregando reunião...">
        <p className="text-sm text-slate-500">Um instante.</p>
      </BookingShell>
    );
  }

  if (!detail) {
    return (
      <BookingShell empresaNome="BuildAI Leads" titulo="Link inválido">
        <p className="text-sm text-slate-600">{error}</p>
      </BookingShell>
    );
  }

  const horarios = days.find((day) => day.data === selectedDay)?.horarios ?? [];
  const active = detail.status === "confirmado";

  return (
    <BookingShell empresaNome={detail.nome || "Sua reunião"} titulo={detail.titulo}>
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <p className="font-display text-2xl font-semibold">{formatDateTimeSP(detail.inicio)}</p>
        <p className="text-xs text-slate-500">Horário de Brasília · {detail.duracaoMin} min</p>
        {!active && <p className="text-sm font-medium text-[#EA580C]">Esta reunião foi cancelada.</p>}
        {detail.meetLink && active && (
          <a href={detail.meetLink} className="block text-sm font-semibold text-[#EA580C] break-all">
            {detail.meetLink}
          </a>
        )}
        {active && mode !== "remarcar" && (
          <div className="flex flex-wrap gap-2">
            <a
              href={googleCalendarUrl({
                title: detail.titulo,
                start: detail.inicio,
                end: detail.fim,
                details: detail.meetLink,
                location: detail.meetLink,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-[#F97316] text-white text-sm font-semibold"
            >
              Adicionar ao calendário
            </a>
            <button
              type="button"
              onClick={() => void openReschedule()}
              disabled={busy}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold cursor-pointer"
            >
              Remarcar
            </button>
            <button
              type="button"
              onClick={() => void cancel()}
              disabled={busy}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        )}
        {mode === "feito" && <p className="text-sm text-emerald-700">Reunião remarcada.</p>}
        {mode === "remarcar" && (
          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto">
              {days.map((day) => {
                const bits = dayBits(day.data);
                const selected = day.data === selectedDay;
                return (
                  <button
                    key={day.data}
                    type="button"
                    onClick={() => setSelectedDay(day.data)}
                    className={`shrink-0 rounded-xl border px-3 py-2 text-sm cursor-pointer ${
                      selected ? "bg-[#10152A] text-white border-[#10152A]" : "bg-white border-slate-200"
                    }`}
                  >
                    {bits.week} {bits.date}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {horarios.map((iso) => (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedSlot(iso)}
                  className={`rounded-lg border px-2 py-2 text-sm cursor-pointer ${
                    selectedSlot === iso
                      ? "bg-[#F97316] text-white border-[#F97316]"
                      : "border-slate-200"
                  }`}
                >
                  {formatTimeSP(iso)}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!selectedSlot || busy}
              onClick={() => void reschedule()}
              className="w-full rounded-lg bg-[#10152A] text-white py-2.5 text-sm font-semibold disabled:opacity-60 cursor-pointer"
            >
              {busy ? "Salvando..." : "Confirmar novo horário"}
            </button>
          </div>
        )}
        {error && <p className="text-sm text-[#EA580C]">{error}</p>}
      </div>
    </BookingShell>
  );
}
