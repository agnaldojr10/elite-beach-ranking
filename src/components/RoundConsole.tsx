"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { shareText } from "@/lib/share";
import { isValidBeachScore } from "@/lib/score";
import {
  confirmarDuplas,
  encerrar,
  exportRodada,
  gerarMataMata,
  quickAddGuest,
  saveDrawConfig,
  saveScore,
  sortear,
  toggleAttendance,
  trocarParceiro,
} from "@/app/sorteio/[roundId]/actions";

type Eligible = { id: string; nome: string; type: "REGULAR" | "GUEST" };
type Jogo = { matchId: string; labelA: string; labelB: string; scoreA: number | null; scoreB: number | null };
type Grupo = {
  label: string;
  duplas: { id: string; label: string }[];
  jogos: Jogo[];
  classificacao: { label: string; wins: number; saldo: number }[];
};
type KoJogo = Jogo & { phaseLabel: string };
type Config = { groupSize: number; balanceByRanking: boolean; avoidRepeat: boolean; randomness: number };
type StepKey = "presenca" | "config" | "sortear" | "jogos" | "encerrar";

/**
 * Interpreta o placar digitado. Aceita separadores (6-2, 6/2, 6x2, 6 2) e
 * também dois dígitos colados (62 → 6-2), já que no beach tennis cada lado é
 * um único dígito (0–7). Retorna [a, b] ou null se não conseguir ler.
 */
function parseScore(raw: string): [number, number] | null {
  const s = raw.trim();
  if (!s) return null;
  const sep = s.match(/^(\d+)\s*[-/x:.\s]\s*(\d+)$/i);
  if (sep) return [parseInt(sep[1], 10), parseInt(sep[2], 10)];
  const digits = s.replace(/\D/g, "");
  if (digits.length === 2) return [parseInt(digits[0], 10), parseInt(digits[1], 10)];
  return null;
}

function MatchRow({
  m,
  disabled,
  onSave,
}: {
  m: Jogo;
  disabled: boolean;
  onSave: (matchId: string, a: number, b: number) => void;
}) {
  const initial = m.scoreA != null && m.scoreB != null ? `${m.scoreA}-${m.scoreB}` : "";
  const [val, setVal] = useState(initial);
  const [err, setErr] = useState<string | null>(null);

  function commit() {
    const raw = val.trim();
    if (raw === "") {
      setErr(null);
      return;
    }
    const parsed = parseScore(raw);
    if (!parsed) {
      setErr("Use o formato 6-2");
      return;
    }
    const [a, b] = parsed;
    if (!isValidBeachScore(a, b)) {
      setErr("Placar inválido para o beach tennis");
      return;
    }
    setErr(null);
    setVal(`${a}-${b}`);
    if (a !== m.scoreA || b !== m.scoreB) onSave(m.matchId, a, b);
  }

  const input = `w-16 rounded-lg border bg-card px-2 py-1.5 text-center text-sm font-semibold text-ink outline-none focus:border-accent disabled:opacity-60 ${
    err ? "border-danger" : "border-line"
  }`;

  return (
    <div className="flex flex-col gap-0.5 border-b border-line py-2 last:border-0">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-xs text-ink">
          {m.labelA} <span className="text-muted">vs</span> {m.labelB}
        </p>
        <input
          inputMode="numeric"
          value={val}
          disabled={disabled}
          placeholder="6-2"
          maxLength={5}
          onChange={(e) => {
            setVal(e.target.value);
            setErr(null);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className={input}
        />
      </div>
      {err && <p className="text-right text-[10.5px] font-semibold text-danger">{err}</p>}
    </div>
  );
}

function Toggle({ on, onClick, label, sub }: { on: boolean; onClick: () => void; label: string; sub: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-muted">{sub}</p>
      </div>
      <button
        onClick={onClick}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-accent" : "bg-line"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

export function RoundConsole({
  roundId,
  presentes,
  eligibles,
  config,
  configConfirmed,
  duplasConfirmed,
  grupos,
  mataMata,
  gruposCompletos,
  jogosCompletos,
  encerrada,
}: {
  roundId: string;
  presentes: string[];
  eligibles: Eligible[];
  config: Config;
  configConfirmed: boolean;
  duplasConfirmed: boolean;
  grupos: Grupo[];
  mataMata: KoJogo[];
  gruposCompletos: boolean;
  jogosCompletos: boolean;
  encerrada: boolean;
}) {
  const router = useRouter();
  const [present, setPresent] = useState<Set<string>>(new Set(presentes));
  const [search, setSearch] = useState("");
  const [guest, setGuest] = useState("");
  const [cfg, setCfg] = useState<Config>(config);
  const [groupSizeInput, setGroupSizeInput] = useState(String(config.groupSize));
  const [repeated, setRepeated] = useState<{ player1: string; player2: string; timesBefore: number }[] | null>(null);
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allDuplas = useMemo(() => grupos.flatMap((g) => g.duplas), [grupos]);

  const presencaOk = present.size >= 4 && present.size % 2 === 0;
  const totalDuplas = grupos.reduce((s, g) => s + g.duplas.length, 0);

  const currentStep = (): StepKey => {
    if (encerrada) return "encerrar";
    if (!presencaOk) return "presenca";
    if (!configConfirmed) return "config";
    if (!duplasConfirmed) return "sortear";
    if (!jogosCompletos) return "jogos";
    return "encerrar";
  };
  const [expanded, setExpanded] = useState<StepKey>(currentStep());

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
  function salvarConfig() {
    setError(null);
    const groupSize = parseInt(groupSizeInput, 10);
    if (!Number.isInteger(groupSize) || groupSize < 2 || groupSize > 6) {
      setError("Informe um tamanho de grupo entre 2 e 6 duplas.");
      return;
    }
    const payload = { ...cfg, groupSize };
    startTransition(async () => {
      const res = await saveDrawConfig(roundId, payload);
      if (res.ok) {
        setCfg(payload);
        setExpanded("sortear");
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
  function doTrocar(a: string, b: string) {
    setSwapFor(null);
    startTransition(async () => {
      const res = await trocarParceiro(roundId, a, b);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }
  function shareDuplas() {
    const txt = grupos
      .map((g) => `Grupo ${g.label}:\n${g.duplas.map((d) => `• ${d.label}`).join("\n")}`)
      .join("\n\n");
    void shareText(`🎾 Duplas sorteadas\n\n${txt}`);
  }
  function doConfirmarDuplas() {
    startTransition(async () => {
      const res = await confirmarDuplas(roundId);
      if (res.ok) {
        setExpanded("jogos");
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
    if (!confirm("Encerrar a rodada aplica os pontos e atualiza o ranking. Continuar?")) return;
    startTransition(async () => {
      const res = await encerrar(roundId);
      if (res.ok) {
        router.refresh();
        const exp = await exportRodada(roundId);
        if (exp.ok) void shareText(exp.text);
      } else setError(res.error);
    });
  }
  function doExport() {
    setError(null);
    startTransition(async () => {
      const exp = await exportRodada(roundId);
      if (exp.ok) void shareText(exp.text);
      else setError(exp.error);
    });
  }

  const steps: {
    key: StepKey;
    title: string;
    summary: string;
    done: boolean;
    locked: boolean;
    body: ReactNode;
  }[] = [
    {
      key: "presenca",
      title: "Presença",
      summary: presencaOk ? `${present.size} confirmados` : `${present.size} selecionados (mín. 4, par)`,
      done: presencaOk,
      locked: false,
      body: (
        <div className="flex flex-col gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar jogador..."
            className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
          />
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {list.map((p) => {
              const on = present.has(p.id);
              return (
                <li key={p.id}>
                  <button onClick={() => toggle(p.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-md border text-[11px] ${on ? "border-accent bg-accent text-accent-ink" : "border-line text-transparent"}`}>✓</span>
                    <span className="flex-1 truncate text-sm text-ink">{p.nome}</span>
                    {p.type === "GUEST" && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">Não pontua</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex gap-2">
            <input value={guest} onChange={(e) => setGuest(e.target.value)} placeholder="Cadastro rápido de convidado" className="flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-accent" />
            <button onClick={addGuest} disabled={pending} className="rounded-xl border border-line bg-surface px-4 text-xl text-ink disabled:opacity-70">+</button>
          </div>
          <button
            onClick={() => setExpanded("config")}
            disabled={!presencaOk}
            className="mt-1 w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-60"
          >
            Continuar
          </button>
        </div>
      ),
    },
    {
      key: "config",
      title: "Configuração do sorteio",
      summary: configConfirmed
        ? `Grupos de ${config.groupSize} duplas · equilíbrio ${config.balanceByRanking ? "ativado" : "desativado"}`
        : presencaOk
          ? `${present.size} presentes (${present.size / 2} duplas)`
          : "Aguardando presença",
      done: configConfirmed,
      locked: !presencaOk,
      body: (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted">
            {present.size} presentes = {present.size / 2} duplas. Ex.: 8 duplas → grupos de 4 (2 grupos); 9 duplas → grupos de 3 (3 grupos).
          </p>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Tamanho do grupo (nº de duplas)</label>
            <input
              inputMode="numeric"
              value={groupSizeInput}
              placeholder="Ex.: 4"
              onChange={(e) => setGroupSizeInput(e.target.value.replace(/\D/g, "").slice(0, 1))}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
            <p className="mt-1 text-[11px] text-muted">Entre 2 e 6 duplas por grupo.</p>
          </div>
          <Toggle on={cfg.balanceByRanking} onClick={() => setCfg({ ...cfg, balanceByRanking: !cfg.balanceByRanking })} label="Equilíbrio por ranking" sub="Pareia bem colocado com menos colocado" />
          <Toggle on={cfg.avoidRepeat} onClick={() => setCfg({ ...cfg, avoidRepeat: !cfg.avoidRepeat })} label="Evitar repetição de duplas" sub="Usa o histórico de duplas do campeonato" />
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Aleatoriedade — {cfg.randomness}%</label>
            <input type="range" min={0} max={100} value={cfg.randomness} onChange={(e) => setCfg({ ...cfg, randomness: parseInt(e.target.value) })} className="w-full accent-[color:var(--color-accent)]" />
          </div>
          <button onClick={salvarConfig} disabled={pending} className="mt-1 w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-70">
            {pending ? "Salvando…" : "Continuar para o sorteio"}
          </button>
        </div>
      ),
    },
    {
      key: "sortear",
      title: "Sortear",
      summary: duplasConfirmed
        ? `${totalDuplas} duplas confirmadas`
        : grupos.length > 0
          ? `${totalDuplas} duplas sorteadas — confirme`
          : "Pronto para sortear",
      done: duplasConfirmed,
      locked: !configConfirmed,
      body: (
        <div className="flex flex-col gap-3">
          {!duplasConfirmed && (
            <button onClick={doSortear} disabled={pending} className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-70">
              {pending ? "Sorteando…" : grupos.length > 0 ? "Refazer sorteio" : "Sortear duplas"}
            </button>
          )}
          {repeated && repeated.length > 0 && (
            <div className="rounded-xl bg-warning/15 p-3 text-xs text-warning">
              <p className="font-bold">Atenção: duplas repetidas neste sorteio</p>
              <ul className="mt-1 list-disc pl-4">
                {repeated.map((r, i) => (
                  <li key={i}>{r.player1} & {r.player2} (já jogaram {r.timesBefore}×)</li>
                ))}
              </ul>
            </div>
          )}
          {grupos.length > 0 && (
            <>
              {grupos.map((g) => (
                <div key={g.label} className="rounded-xl border border-line bg-surface p-3">
                  <p className="mb-1 text-xs font-bold uppercase text-muted">Grupo {g.label}</p>
                  <ul className="flex flex-col gap-1">
                    {g.duplas.map((d) => (
                      <li key={d.id} className="flex flex-col">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-ink">{d.label}</span>
                          {!duplasConfirmed && (
                            <button
                              onClick={() => setSwapFor(swapFor === d.id ? null : d.id)}
                              className="text-xs font-semibold text-accent"
                            >
                              Trocar
                            </button>
                          )}
                        </div>
                        {swapFor === d.id && (
                          <div className="mt-1 flex flex-col gap-1 border-l-2 border-line pl-2">
                            {allDuplas
                              .filter((x) => x.id !== d.id)
                              .map((x) => (
                                <button
                                  key={x.id}
                                  onClick={() => doTrocar(d.id, x.id)}
                                  disabled={pending}
                                  className="text-left text-xs text-muted disabled:opacity-70"
                                >
                                  ↔ trocar parceiro com {x.label}
                                </button>
                              ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <button onClick={shareDuplas} className="w-full rounded-xl bg-accent/15 py-2.5 text-sm font-semibold text-accent">
                Compartilhar duplas
              </button>
              {!duplasConfirmed ? (
                <button onClick={doConfirmarDuplas} disabled={pending} className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-70">
                  Confirmar duplas
                </button>
              ) : (
                <p className="rounded-xl bg-success/15 py-2.5 text-center text-sm font-bold text-success">Duplas confirmadas</p>
              )}
            </>
          )}
        </div>
      ),
    },
    {
      key: "jogos",
      title: "Jogos & Resultados",
      summary: jogosCompletos ? "Grupos e mata-mata completos" : duplasConfirmed ? "Lance os placares" : "Aguardando duplas",
      done: jogosCompletos,
      locked: !duplasConfirmed,
      body: (
        <div className="flex flex-col gap-4">
          {grupos.map((g) => (
            <div key={g.label} className="rounded-xl border border-line bg-surface p-3">
              <p className="mb-1 text-xs font-bold uppercase text-accent">Grupo {g.label}</p>
              {g.jogos.map((m) => <MatchRow key={m.matchId} m={m} disabled={encerrada} onSave={saveMatch} />)}
              <ul className="mt-2 flex flex-col gap-0.5">
                {g.classificacao.map((s, i) => (
                  <li key={i} className="flex justify-between text-xs text-muted">
                    <span>{i + 1}. {s.label}</span>
                    <span className="text-ink">{s.wins}V · saldo {s.saldo}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="mb-2 text-xs font-bold uppercase text-accent">Mata-mata</p>
            {mataMata.length === 0 ? (
              gruposCompletos ? (
                <button onClick={doGerarMataMata} disabled={pending} className="w-full rounded-xl bg-accent py-2.5 text-sm font-bold text-accent-ink disabled:opacity-70">
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
                  {jogos.map((m) => <MatchRow key={m.matchId} m={m} disabled={encerrada} onSave={saveMatch} />)}
                </div>
              ))
            )}
          </div>
          {jogosCompletos && !encerrada && (
            <button onClick={() => setExpanded("encerrar")} className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink">
              Ir para o encerramento
            </button>
          )}
        </div>
      ),
    },
    {
      key: "encerrar",
      title: "Encerrar rodada",
      summary: encerrada ? "Rodada encerrada" : jogosCompletos ? "Pronta para encerrar" : "Aguardando os jogos",
      done: encerrada,
      locked: !jogosCompletos,
      body: encerrada ? (
        <div className="flex flex-col gap-3">
          <p className="rounded-xl bg-success/15 py-2.5 text-center text-sm font-bold text-success">
            Rodada encerrada — ranking atualizado.
          </p>
          <button onClick={doExport} disabled={pending} className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-70">
            {pending ? "Gerando…" : "Compartilhar resultado + ranking"}
          </button>
        </div>
      ) : (
        <button onClick={doEncerrar} disabled={pending} className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-70">
          {pending ? "Encerrando…" : "Encerrar rodada"}
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm font-semibold text-danger">{error}</p>}
      {steps.map((s, i) => {
        const open = expanded === s.key && !s.locked;
        return (
          <section key={s.key} className={`overflow-hidden rounded-2xl border border-line bg-card ${s.locked ? "opacity-50" : ""}`}>
            <button
              onClick={() => !s.locked && setExpanded(open ? ("" as StepKey) : s.key)}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${s.done ? "bg-success text-white" : "bg-accent/15 text-accent"}`}>
                {s.done ? "✓" : i + 1}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold text-ink">{s.title}</span>
                <span className="block text-xs text-muted">{s.summary}</span>
              </span>
              <span className={`text-muted transition-transform ${open ? "rotate-90" : ""}`}>›</span>
            </button>
            {open && <div className="px-4 pb-4">{s.body}</div>}
          </section>
        );
      })}
    </div>
  );
}
