"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { registrarPodioFinals } from "@/app/sorteio/[roundId]/actions";

type Classificado = { playerId: string; nome: string };
type PodiumRegistrado = { tier: "CAMPEAO" | "VICE" | "TERCEIRO"; nome: string }[] | null;

const PLACES = [
  { key: "campeao", label: "Campeão", medal: "text-gold" },
  { key: "vice", label: "Vice-campeão", medal: "text-silver" },
  { key: "terceiro", label: "3º lugar", medal: "text-bronze" },
] as const;

export function FinalsConsole({
  roundId,
  classificados,
  registrado,
}: {
  roundId: string;
  classificados: Classificado[];
  registrado: PodiumRegistrado;
}) {
  const router = useRouter();
  const [sel, setSel] = useState<Record<string, [string, string]>>({
    campeao: ["", ""],
    vice: ["", ""],
    terceiro: ["", ""],
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setPlayer(place: string, idx: 0 | 1, value: string) {
    setSel((prev) => {
      const pair: [string, string] = [...prev[place]] as [string, string];
      pair[idx] = value;
      return { ...prev, [place]: pair };
    });
  }

  function salvar() {
    setError(null);
    startTransition(async () => {
      const res = await registrarPodioFinals(roundId, {
        campeao: sel.campeao,
        vice: sel.vice,
        terceiro: sel.terceiro,
      });
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  const opt = (value: string, place: string, idx: 0 | 1) => (
    <select
      value={value}
      onChange={(e) => setPlayer(place, idx, e.target.value)}
      className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
    >
      <option value="">Selecione…</option>
      {classificados.map((c) => (
        <option key={c.playerId} value={c.playerId}>
          {c.nome}
        </option>
      ))}
    </select>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-line bg-card p-4 text-sm text-muted">
        A FINALS é sorteada no papel. Abaixo estão os 12 classificados; depois registre o pódio.
      </div>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="mb-2 text-sm font-bold text-ink">12 classificados</h2>
        {classificados.length === 0 ? (
          <p className="text-sm text-muted">Ainda não há ranking suficiente para classificar.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {classificados.map((c, i) => (
              <li key={c.playerId} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-center font-bold text-muted">{i + 1}º</span>
                <span className="text-ink">{c.nome}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="mb-3 text-sm font-bold text-ink">Pódio da Final</h2>

        {registrado ? (
          <ul className="flex flex-col gap-2">
            {PLACES.map((p) => {
              const nomes = registrado.filter((r) => r.tier === (p.key.toUpperCase() as never)).map((r) => r.nome);
              return (
                <li key={p.key} className="flex items-center gap-3">
                  <span className={`w-28 text-sm font-bold ${p.medal}`}>{p.label}</span>
                  <span className="text-sm text-ink">{nomes.join(" & ") || "—"}</span>
                </li>
              );
            })}
            <p className="mt-2 text-xs text-success">Pódio registrado.</p>
          </ul>
        ) : (
          <div className="flex flex-col gap-4">
            {PLACES.map((p) => (
              <div key={p.key}>
                <p className={`mb-1 text-xs font-bold ${p.medal}`}>{p.label}</p>
                <div className="flex gap-2">
                  {opt(sel[p.key][0], p.key, 0)}
                  {opt(sel[p.key][1], p.key, 1)}
                </div>
              </div>
            ))}
            {error && <p className="text-sm font-semibold text-danger">{error}</p>}
            <button
              onClick={salvar}
              disabled={pending || classificados.length === 0}
              className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-60"
            >
              {pending ? "Registrando…" : "Registrar pódio da Final"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
