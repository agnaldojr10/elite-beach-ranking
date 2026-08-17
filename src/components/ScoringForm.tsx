"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateScoring } from "@/app/configuracoes/actions";
import type { ScoringInput } from "@/lib/schemas/config";

type Props = { championshipId: string; initial: ScoringInput };

const FIELDS: { key: keyof ScoringInput; label: string }[] = [
  { key: "ptsParticipacao", label: "Participação" },
  { key: "ptsQuartas", label: "Eliminado nas quartas" },
  { key: "pts4", label: "4º colocado" },
  { key: "pts3", label: "3º colocado" },
  { key: "ptsVice", label: "Vice-campeão" },
  { key: "ptsCampeao", label: "Campeão" },
];

export function ScoringForm({ championshipId, initial }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<ScoringInput>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setMsg(null);
    setError(null);
    startTransition(async () => {
      const res = await updateScoring(championshipId, values);
      if (res.ok) {
        setMsg("Pontuação salva.");
        router.refresh();
      } else setError(res.error);
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      {FIELDS.map((f) => (
        <div key={f.key} className="flex items-center justify-between border-b border-line py-2.5 last:border-0">
          <span className="text-sm text-ink">{f.label}</span>
          <input
            inputMode="numeric"
            value={values[f.key]}
            onChange={(e) =>
              setValues({ ...values, [f.key]: parseInt(e.target.value.replace(/\D/g, "")) || 0 })
            }
            className="w-16 rounded-lg border border-line bg-surface px-2 py-1.5 text-center text-sm font-semibold text-ink outline-none focus:border-accent"
          />
        </div>
      ))}
      <p className="mt-2 text-xs text-muted">A última rodada aplica peso 2x sobre estes valores.</p>
      {error && <p className="mt-2 text-sm font-semibold text-danger">{error}</p>}
      {msg && <p className="mt-2 text-sm font-semibold text-success">{msg}</p>}
      <button
        onClick={save}
        disabled={pending}
        className="mt-3 w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-70"
      >
        {pending ? "Salvando…" : "Salvar pontuação"}
      </button>
    </div>
  );
}
