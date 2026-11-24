import type { ReactNode } from "react";

interface BookingShellProps {
  empresaNome: string;
  titulo: string;
  descricao?: string;
  logoUrl?: string;
  children: ReactNode;
}

export function BookingShell({
  empresaNome,
  titulo,
  descricao,
  logoUrl,
  children,
}: BookingShellProps) {
  const initial = (empresaNome || titulo || "B").trim().charAt(0).toUpperCase();
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#10152A]">
      <header className="bg-[#10152A] text-white">
        <div className="max-w-lg mx-auto px-5 py-8">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="w-12 h-12 rounded-xl object-cover bg-white"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[#F97316] text-white font-display text-xl font-bold flex items-center justify-center">
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs text-slate-300 truncate">{empresaNome}</p>
              <h1 className="font-display text-xl font-semibold leading-tight">{titulo}</h1>
            </div>
          </div>
          {descricao && (
            <p className="mt-4 text-sm text-slate-300 leading-relaxed">{descricao}</p>
          )}
        </div>
      </header>
      <main className="max-w-lg mx-auto px-5 py-6">{children}</main>
    </div>
  );
}
