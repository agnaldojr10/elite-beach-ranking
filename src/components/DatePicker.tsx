"use client";

import { useEffect, useRef, useState } from "react";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const fmtBR = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : "";
};

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecionar data",
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const initial = value ? new Date(value + "T00:00:00") : new Date();
  const [view, setView] = useState({ y: initial.getFullYear(), m: initial.getMonth() });

  // Ao abrir, posiciona o calendário no mês do valor atual (ou no mês corrente).
  useEffect(() => {
    if (open) {
      const base = value ? new Date(value + "T00:00:00") : new Date();
      setView({ y: base.getFullYear(), m: base.getMonth() });
    }
  }, [open, value]);

  const startWeekday = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayISO = toISO(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  function shiftMonth(delta: number) {
    setView((v) => {
      const m = v.m + delta;
      if (m < 0) return { y: v.y - 1, m: 11 };
      if (m > 11) return { y: v.y + 1, m: 0 };
      return { y: v.y, m };
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-accent"
      >
        <span className={value ? "text-ink" : "text-muted"}>
          {value ? fmtBR(value) : placeholder}
        </span>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
          <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
          <path d="M3 9h18M8 3v3M16 3v3" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-72 rounded-2xl border border-line bg-surface p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Mês anterior"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink"
            >
              ‹
            </button>
            <span className="text-sm font-bold capitalize text-ink">
              {MESES[view.m]} de {view.y}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Próximo mês"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink"
            >
              ›
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {DIAS.map((d, i) => (
              <span key={i} className="py-1 text-center text-[11px] font-semibold text-muted">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <span key={i} />;
              const iso = toISO(view.y, view.m, d);
              const selected = iso === value;
              const isToday = iso === todayISO;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={`flex h-9 items-center justify-center rounded-lg text-sm transition ${
                    selected
                      ? "bg-accent font-bold text-accent-ink"
                      : isToday
                        ? "border border-accent text-ink"
                        : "text-ink hover:bg-accent/10"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
