"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  encerrar,
  gerarMataMata,
  quickAddGuest,
  saveScore,
  sortear,
  toggleAttendance,
} from "@/app/sorteio/[roundId]/actions";

type Eligible = { id: string; nome: string; type: "REGULAR" | "GUEST" };
type Jogo = {
  matchId: string;
  labelA: string;
  labelB: string;
  scoreA: number | null;
  scoreB: number | null;
};
type Grupo = {
  label: string;
  duplas: { id: string; label: string }[];
  jogos: Jogo[];
  classificacao: { label: string; wins: number; saldo: number }[];
};
type KoJogo = Jogo & { phaseLabel: string };
type Repeated = { player1: string; player2: string; timesBefore: number };

function MatchRow({
  m,
  disabled,
  onSave,
}: {
  m: Jogo;
  disabled: boolean;
  onSave: (matchId: string, a: number, b: number) => void;
}) {
  const [a, setA] = useState(m.scoreA?.toString() ?? "");
  const [b, setB] = useState(m.scoreB?.toString() ?? "");
  function commit() {
    if (a !== "" && b !== "") {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (Number.isInteger(na) && Number.isInteger(nb)) onSave(m.matchId, na, nb);
    }
  }
  const input =
    "w-10 rounded-lg border border-line bg-card px-1 py-1.5 text-center text-sm font-semibold text-ink outline-none focus:border-accent disabled:opacity-60";
  return (
    <div className="flex items-center gap-2 border-b border-line py-2 last:border-0">
      <p className="flex-1 text-xs text-ink">
        {m.labelA} <span className="text-muted">vs</span> {m.labelB}
      </p>
      <input
        inputMode="numeric"
        value={a}
        disabled={disabled}
        onChange={(e) => setA(e.target.value.replace(/\D/g, "").slice(0, 2))}
        onBlur={commit}
        className={input}
      />
      <span className="text-muted">-</span>
      <input
        inputMode="numeric"
        value={b}
        disabled={disabled}
        onChange={(e) => setB(e.target.value.replace(/\D/g, "").slice(0, 2))}
        onBlur={commit}
        className={input}
      />
    </div>
  );
}

export function RoundConsole({
  roundId,
  status,
  presentes,
  eligibles,
  grupos,
  mataMata,
  gruposCompletos,
  podeEncerrar,
  encerrada,
}: {
  roundId: string;
  status: string;
  presentes: string[];
  eligibles: Eligible[];
  grupos: Grupo[];
  mataMata: KoJogo[];
  gruposCompletos: boolean;
  podeEncerrar: boolean;
  encerrada: boolean;
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

  const jaSorteado = grupos.length > 0;

  function toggle(id: string) {
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    startTransition(() => void toggleAttendance(roundId, id));
  }

  function addGuest() {
    if (guest.trim().length < 2) return;
    startTransition(async () => {
      const res = await quickAddGuest(roundId, guest);
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

  function saveMatch(matchId: string, a: number, b: number) {
    startTransition(async () => {
      const res = await saveScore(roundId, matchId, a, b);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function doGerarMataMata() {
    setError(null);
    startTransition(async () => {
      const res = await gerarMataMata(roundId);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function doEncerrar() {
    setError(null);
    if (!confirm("Encerrar a rodada aplica os pontos e atualiza o ranking. Continuar?")) return;
    startTransition(async () => {
      const res = await encerrar(roundId);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  const n = present.size;

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm font-semibold text-danger">{error}</p>}
      {encerrada && (
        <div className="rounded-xl bg-success/15 p-3 text-center text-sm font-bold text-success">
          Rodada encerrada — ranking atualizado.
        </div>
      )}

      {/* Presença */}
      {!encerrada && (
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
          <ul className="mb-3 flex max-h-64 flex-col gap-1 overflow-y-auto">
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
                        on
                          ? "border-accent bg-accent text-accent-ink"
                          : "border-line text-transparent"
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
      )}

      {/* Sortear */}
      {!encerrada && (
        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="mb-2 text-sm font-bold text-ink">Sortear</h2>
          {n < 4 ? (
            <p className="text-sm text-muted">Selecione ao menos 4 jogadores presentes.</p>
          ) : n % 2 !== 0 ? (
            <p className="text-sm text-warning">Número ímpar de presentes ({n}). Ajuste para par.</p>
          ) : (
            <button
              onClick={doSortear}
              disabled={pending}
              className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-70"
            >
              {pending ? "Sorteando…" : jaSorteado ? "Refazer sorteio" : "Sortear duplas"}
            </button>
          )}
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
        </section>
      )}

      {/* Jogos & Resultados */}
      {jaSorteado && (
        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="mb-3 text-sm font-bold text-ink">Jogos &amp; Resultados</h2>

          {grupos.map((g) => (
            <div key={g.label} className="mb-4 rounded-xl border border-line bg-surface p-3">
              <p className="mb-1 text-xs font-bold uppercase text-accent">Grupo {g.label}</p>
              {g.jogos.map((m) => (
                <MatchRow key={m.matchId} m={m} disabled={encerrada} onSave={saveMatch} />
              ))}
              <ul className="mt-2 flex flex-col gap-0.5">
                {g.classificacao.map((s, i) => (
                  <li key={i} className="flex justify-between text-xs text-muted">
                    <span>
                      {i + 1}. {s.label}
                    </span>
                    <span className="text-ink">
                      {s.wins}V · saldo {s.saldo}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Mata-mata */}
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="mb-2 text-xs font-bold uppercase text-accent">Mata-mata</p>
            {mataMata.length === 0 ? (
              gruposCompletos ? (
                <button
                  onClick={doGerarMataMata}
                  disabled={pending}
                  className="w-full rounded-xl bg-accent py-2.5 text-sm font-bold text-accent-ink disabled:opacity-70"
                >
                  {pending ? "Gerando…" : "Gerar mata-mata"}
                </button>
              ) : (
                <p className="text-xs text-muted">Finalize os placares dos grupos para liberar.</p>
              )
            ) : (
              Object.entries(
                mataMata.reduce<Record<string, KoJogo[]>>((acc, m) => {
                  (acc[m.phaseLabel] ??= []).push(m);
                  return acc;
                }, {}),
              ).map(([fase, jogos]) => (
                <div key={fase} className="mb-2">
                  <p className="text-[11px] font-bold uppercase text-muted">{fase}</p>
                  {jogos.map((m) => (
                    <MatchRow key={m.matchId} m={m} disabled={encerrada} onSave={saveMatch} />
                  ))}
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Encerrar */}
      {jaSorteado && !encerrada && (
        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="mb-2 text-sm font-bold text-ink">Encerrar rodada</h2>
          {podeEncerrar ? (
            <button
              onClick={doEncerrar}
              disabled={pending}
              className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-70"
            >
              {pending ? "Encerrando…" : "Encerrar rodada"}
            </button>
          ) : (
            <p className="text-sm text-muted">
              Lance o placar da final (e da disputa de 3º) para poder encerrar.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
