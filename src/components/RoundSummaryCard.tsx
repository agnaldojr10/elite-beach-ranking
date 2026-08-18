"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setPeso } from "@/app/sorteio/[roundId]/actions";

type Status = "ABERTA" | "SORTEADA" | "ENCERRADA" | "AGENDADA";

const STATUS: Record<string, { label: string; cls: string }> = {
  ABERTA: { label: "Aberta", cls: "bg-ocean/15 text-ocean" },
  SORTEADA: { label: "Sorteada", cls: "bg-warning/15 text-warning" },
  ENCERRADA: { label: "Encerrada", cls: "bg-success/15 text-success" },
  AGENDADA: { label: "Especial", cls: "bg-accent/15 text-accent" },
};

const brDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });

export function RoundSummaryCard({
  roundId,
  numero,
  data,
  status,
  peso,
}: {
  roundId: string;
  numero: number | null;
  data: string;
  status: Status;
  peso: number;
}) {
  const router = useRouter();
  const [pesoAtual, setPesoAtual] = useState(peso);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const st = STATUS[status] ?? STATUS.ABERTA;
  const encerrada = status === "ENCERRADA";

  function alterarPeso(novo: number) {
    if (novo === pesoAtual || encerrada) return;
    setError(null);
    const anterior = pesoAtual;
    setPesoAtual(novo);
    startTransition(async () => {
      const res = await setPeso(roundId, novo);
      if (res.ok) router.refresh();
      else {
        setPesoAtual(anterior);
        setError(res.error);
      }
    });
  }

  const pesoBtn = (valor: number, label: string) => (
    <button
      onClick={() => alterarPeso(valor)}
      disabled={encerrada || pending}
      className={`rounded-xl px-4 py-2 text-sm font-bold transition disabled:opacity-60 ${
        pesoAtual === valor
          ? "bg-accent text-accent-ink"
          : "border border-line bg-surface text-muted"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mb-4 rounded-2xl border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-ink">Rodada {numero}</p>
          <p className="text-xs text-muted">{brDate(data)}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${st.cls}`}>{st.label}</span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">Peso de pontos da etapa</p>
        <div className="flex gap-2">
          {pesoBtn(1, "1x")}
          {pesoBtn(2, "2x")}
        </div>
      </div>
      {encerrada && <p className="mt-2 text-[11px] text-muted">Rodada encerrada — peso travado.</p>}
      {error && <p className="mt-2 text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}
