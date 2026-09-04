"use client";

import { useState, useTransition } from "react";
import { podioRodada, type PodioItem } from "@/app/sorteio/[roundId]/actions";
import { RoundPodiumPoster } from "./RoundPodiumPoster";

export function RoundPodiumShare({ roundId }: { roundId: string }) {
  const [data, setData] = useState<{ numero: number | null; itens: PodioItem[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function gerar() {
    setErr(null);
    start(async () => {
      const r = await podioRodada(roundId);
      if (r.ok) setData({ numero: r.numero, itens: r.itens });
      else setErr(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {!data && (
        <button
          onClick={gerar}
          disabled={pending}
          className="w-full rounded-xl bg-accent/15 py-3 text-sm font-bold text-accent disabled:opacity-70"
        >
          {pending ? "Gerando…" : "Pódio da rodada (imagem)"}
        </button>
      )}
      {err && <p className="text-sm font-semibold text-danger">{err}</p>}
      {data &&
        (data.itens.length > 0 ? (
          <RoundPodiumPoster numero={data.numero} itens={data.itens} />
        ) : (
          <p className="rounded-xl border border-line bg-card p-3 text-center text-sm text-muted">
            Esta rodada ainda não tem pódio.
          </p>
        ))}
    </div>
  );
}
