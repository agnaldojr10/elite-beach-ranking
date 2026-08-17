"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  quickAddGuest,
  sortear,
  toggleAttendance,
} from "@/app/sorteio/[roundId]/actions";

type Eligible = { id: string; nome: string; type: "REGULAR" | "GUEST" };
type Grupo = { label: string; duplas: { id: string; label: string }[] };
type Repeated = { player1: string; player2: string; timesBefore: number };

export function RoundConsole({
  roundId,
  status,
  presentes,
  eligibles,
  grupos,
}: {
  roundId: string;
  status: string;
  presentes: string[];
  eligibles: Eligible[];
  grupos: Grupo[];
}) {
  const router = useRouter();
  const [present, setPresent] = useState<Set<string>>(new Set(presentes));
  const [search, setSearch] = useState("");
  const [guest, setGuest] = useState("");
  const [repeated, setRepeated] = useState<Repeated[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return eligibles.filter((p) => p.nome.toLowerCase().includes(q));
  }, [eligibles, search]);

  function toggle(id: string) {
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    startTransition(() => {
      void toggleAttendance(roundId, id);
    });
  }

  function addGuest() {
    const nome = guest.trim();
    if (nome.length < 2) return;
    startTransition(async () => {
      const res = await quickAddGuest(roundId, nome);
      if (res.ok) {
        setGuest("");
        router.refresh();
      } else setError(res.error);
    });
  }

  function doSortear() {
    setError(null);
    setRepeated(null);
    startTransition(async () => {
      const res = await sortear(roundId);
      if (res.ok) {
        setRepeated(res.repeated);
        router.refresh();
      } else setError(res.error);
    });
  }

  const n = present.size;
  const jaSorteado = grupos.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Presença */}
      <section className="rounded-2xl border border-line bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Presença</h2>
          <span className="text-xs text-muted">{n} confirmados</span>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar jogador..."
          className="mb-2 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
        />

        <ul className="mb-3 flex max-h-72 flex-col gap-1 overflow-y-auto">
          {list.map((p) => {
            const on = present.has(p.id);
            return (
              <li key={p.id}>
                <button
                  onClick={() => toggle(p.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left"
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md border text-[11px] ${
                      on ? "border-accent bg-accent text-accent-ink" : "border-line text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className="flex-1 truncate text-sm text-ink">{p.nome}</span>
                  {p.type === "GUEST" && (
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">
                      Não pontua
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex gap-2">
          <input
            value={guest}
            onChange={(e) => setGuest(e.target.value)}
            placeholder="Cadastro rápido de convidado"
            className="flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
          />
          <button
            onClick={addGuest}
            disabled={pending}
            className="rounded-xl border border-line bg-surface px-4 text-xl text-ink disabled:opacity-70"
          >
            +
          </button>
        </div>
      </section>

      {/* Sortear */}
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="mb-2 text-sm font-bold text-ink">Sortear</h2>

        {n < 4 ? (
          <p className="text-sm text-muted">Selecione ao menos 4 jogadores presentes.</p>
        ) : n % 2 !== 0 ? (
          <p className="text-sm text-warning">
            Número ímpar de presentes ({n}). Ajuste para um número par.
          </p>
        ) : (
          <button
            onClick={doSortear}
            disabled={pending}
            className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-70"
          >
            {pending ? "Sorteando…" : jaSorteado ? "Refazer sorteio" : "Sortear duplas"}
          </button>
        )}

        {error && <p className="mt-2 text-sm font-semibold text-danger">{error}</p>}

        {repeated && repeated.length > 0 && (
          <div className="mt-3 rounded-xl bg-warning/15 p-3 text-xs text-warning">
            <p className="font-bold">Atenção: duplas repetidas neste sorteio</p>
            <ul className="mt-1 list-disc pl-4">
              {repeated.map((r, i) => (
                <li key={i}>
                  {r.player1} & {r.player2} (já jogaram {r.timesBefore}×)
                </li>
              ))}
            </ul>
          </div>
        )}

        {jaSorteado && (
          <div className="mt-4 flex flex-col gap-3">
            {grupos.map((g) => (
              <div key={g.label} className="rounded-xl border border-line bg-surface p-3">
                <p className="mb-1 text-xs font-bold uppercase text-muted">Grupo {g.label}</p>
                <ul className="flex flex-col gap-1">
                  {g.duplas.map((d) => (
                    <li key={d.id} className="text-sm text-ink">
                      {d.label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-xs text-muted">
              Status: {status}. Placares e mata-mata na próxima etapa.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
