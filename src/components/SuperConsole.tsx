"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { shareText } from "@/lib/share";
import { parseScorePair } from "@/lib/score";
import {
  exportTorneio,
  salvarPlacarSuper,
  setStatusTorneio,
} from "@/app/torneios/actions";

type Jogo = {
  matchId: string;
  quadra: number;
  labelA: string;
  labelB: string;
  scoreA: number | null;
  scoreB: number | null;
};
type Rodada = { rodada: number; jogos: Jogo[] };
type Standing = {
  playerId: string;
  nome: string;
  photoUrl: string | null;
  jogos: number;
  vitorias: number;
  saldo: number;
  gamesPro: number;
};

const initials = (nome: string) => {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
};

function MatchRow({
  jogo,
  total,
  disabled,
  onSave,
}: {
  jogo: Jogo;
  total: number;
  disabled: boolean;
  onSave: (matchId: string, a: number, b: number) => void;
}) {
  const initial = jogo.scoreA != null && jogo.scoreB != null ? `${jogo.scoreA}-${jogo.scoreB}` : "";
  const [val, setVal] = useState(initial);
  const [err, setErr] = useState<string | null>(null);

  function commit() {
    const raw = val.trim();
    if (raw === "") {
      setErr(null);
      return;
    }
    const parsed = parseScorePair(raw);
    if (!parsed) {
      setErr("Use o formato 4-3");
      return;
    }
    const [a, b] = parsed;
    if (a + b !== total) {
      setErr(`A soma deve ser ${total}`);
      return;
    }
    if (a === b) {
      setErr("Sem empate");
      return;
    }
    setErr(null);
    setVal(`${a}-${b}`);
    if (a !== jogo.scoreA || b !== jogo.scoreB) onSave(jogo.matchId, a, b);
  }

  return (
    <div className="flex flex-col gap-0.5 border-b border-line py-2 last:border-0">
      <div className="flex items-center gap-2">
        <span className="w-6 shrink-0 text-[10px] font-bold text-muted">Q{jogo.quadra}</span>
        <p className="flex-1 text-xs text-ink">
          {jogo.labelA} <span className="text-muted">vs</span> {jogo.labelB}
        </p>
        <input
          inputMode="numeric"
          value={val}
          disabled={disabled}
          placeholder={`${total - 1}-1`}
          maxLength={5}
          onChange={(e) => {
            setVal(e.target.value);
            setErr(null);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className={`w-16 rounded-lg border bg-card px-2 py-1.5 text-center text-sm font-semibold text-ink outline-none focus:border-accent disabled:opacity-60 ${
            err ? "border-danger" : "border-line"
          }`}
        />
      </div>
      {err && <p className="text-right text-[10.5px] font-semibold text-danger">{err}</p>}
    </div>
  );
}

const medalCls = ["bg-gold/20 text-gold", "bg-silver/20 text-silver", "bg-bronze/20 text-bronze"];

export function SuperConsole({
  tournamentId,
  nome,
  size,
  gamesPerMatch,
  status,
  rodadas,
  standings,
}: {
  tournamentId: string;
  nome: string;
  size: number;
  gamesPerMatch: number;
  status: "ABERTO" | "ENCERRADO";
  rodadas: Rodada[];
  standings: Standing[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"rodadas" | "classificacao">("rodadas");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const encerrado = status === "ENCERRADO";
  const totalJogos = rodadas.reduce((s, r) => s + r.jogos.length, 0);
  const feitos = rodadas.reduce(
    (s, r) => s + r.jogos.filter((j) => j.scoreA != null && j.scoreB != null).length,
    0,
  );

  function salvar(matchId: string, a: number, b: number) {
    setError(null);
    startTransition(async () => {
      const res = await salvarPlacarSuper(tournamentId, matchId, a, b);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }
  function compartilhar() {
    setError(null);
    startTransition(async () => {
      const exp = await exportTorneio(tournamentId);
      if (exp.ok) void shareText(exp.text);
      else setError(exp.error);
    });
  }
  function alterarStatus(novo: "ABERTO" | "ENCERRADO") {
    if (novo === "ENCERRADO" && feitos < totalJogos && !confirm("Ainda há jogos sem placar. Encerrar mesmo assim?")) return;
    startTransition(async () => {
      const res = await setStatusTorneio(tournamentId, novo);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  const tabBtn = (v: "rodadas" | "classificacao", label: string) => (
    <button
      onClick={() => setTab(v)}
      className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${
        tab === v ? "bg-accent text-accent-ink" : "border border-line bg-card text-muted"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-line bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-bold text-ink">{nome}</p>
            <p className="text-xs text-muted">
              Super {size} · {gamesPerMatch} games/jogo · {feitos}/{totalJogos} jogos
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${
              encerrado ? "bg-success/15 text-success" : "bg-ocean/15 text-ocean"
            }`}
          >
            {encerrado ? "Encerrado" : "Em jogo"}
          </span>
        </div>
      </div>

      {error && <p className="text-sm font-semibold text-danger">{error}</p>}

      <div className="flex gap-2">
        {tabBtn("rodadas", "Rodadas")}
        {tabBtn("classificacao", "Classificação")}
      </div>

      {tab === "rodadas" ? (
        <div className="flex flex-col gap-3">
          {rodadas.map((r) => (
            <div key={r.rodada} className="rounded-2xl border border-line bg-card p-3">
              <p className="mb-1 text-xs font-bold uppercase text-accent">Rodada {r.rodada}</p>
              {r.jogos.map((j) => (
                <MatchRow key={j.matchId} jogo={j} total={gamesPerMatch} disabled={encerrado} onSave={salvar} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            onClick={compartilhar}
            disabled={pending}
            className="rounded-xl bg-accent/15 py-2.5 text-sm font-semibold text-accent disabled:opacity-70"
          >
            Compartilhar classificação
          </button>
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="flex items-center gap-2 border-b border-line px-4 py-2 text-[10.5px] font-bold uppercase text-muted">
              <span className="w-5">#</span>
              <span className="flex-1">Atleta</span>
              <span className="w-8 text-center">V</span>
              <span className="w-10 text-center">SG</span>
              <span className="w-10 text-center">GP</span>
            </div>
            <ul>
              {standings.map((s, i) => (
                <li key={s.playerId} className="flex items-center gap-2 border-b border-line px-4 py-2.5 last:border-0">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-bold ${
                      i < 3 ? medalCls[i] : "text-muted"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {s.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.photoUrl} alt={s.nome} className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ocean/15 text-[10px] font-bold text-ocean">
                      {initials(s.nome)}
                    </span>
                  )}
                  <span className="flex-1 truncate text-sm font-semibold text-ink">{s.nome}</span>
                  <span className="w-8 text-center text-sm font-bold text-ink">{s.vitorias}</span>
                  <span className="w-10 text-center text-xs text-muted">
                    {s.saldo >= 0 ? "+" : ""}
                    {s.saldo}
                  </span>
                  <span className="w-10 text-center text-xs text-muted">{s.gamesPro}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {encerrado ? (
        <button
          onClick={() => alterarStatus("ABERTO")}
          disabled={pending}
          className="w-full rounded-xl bg-warning/15 py-3 text-sm font-bold text-warning disabled:opacity-70"
        >
          Reabrir torneio
        </button>
      ) : (
        <button
          onClick={() => alterarStatus("ENCERRADO")}
          disabled={pending}
          className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-70"
        >
          Encerrar torneio
        </button>
      )}
    </div>
  );
}
