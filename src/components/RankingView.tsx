"use client";

import Link from "next/link";
import { useState } from "react";
import { shareText } from "@/lib/share";
import { RankingPoster } from "@/components/poster/RankingPoster";

type Row = {
  posicao: number;
  playerId: string;
  nome: string;
  photoUrl: string | null;
  pontos: number;
  variacao: "up" | "down" | "same";
};
type PneuDetalhe = { rodada: number | null; adversarios: string; parceiro: string };
type Pneu = { playerId: string; nome: string; vezes: number; detalhes: PneuDetalhe[] } | null;
type Rodada = {
  id: string;
  numero: number;
  results: { pos: number; nome: string; tierLabel: string; pts: number }[];
};

const initials = (nome: string) => {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
};

const VAR: Record<Row["variacao"], { icon: string; cls: string }> = {
  up: { icon: "▲", cls: "text-success" },
  down: { icon: "▼", cls: "text-danger" },
  same: { icon: "–", cls: "text-muted" },
};

function Podium({ rows }: { rows: Row[] }) {
  const top3 = rows.slice(0, 3);
  if (top3.length === 0) return null;
  const order = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;
  const medal = ["bg-silver/20 text-silver", "bg-gold/20 text-gold", "bg-bronze/20 text-bronze"];
  const heights = ["h-20", "h-28", "h-16"];
  const posOf = (r: Row) => rows.findIndex((x) => x.playerId === r.playerId) + 1;

  return (
    <div className="mb-4 flex items-end justify-center gap-3">
      {order.map((r, i) => (
        <div key={r.playerId} className="flex w-24 flex-col items-center gap-1">
          <div
            className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full text-sm font-bold ${medal[i]}`}
          >
            {r.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.photoUrl} alt={r.nome} className="h-full w-full object-cover" />
            ) : (
              initials(r.nome)
            )}
          </div>
          <p className="text-center text-xs font-semibold leading-tight text-ink">{r.nome}</p>
          <p className="text-[11px] text-muted">{r.pontos} pts</p>
          <div
            className={`flex w-full ${heights[i]} items-start justify-center rounded-t-xl pt-2 text-lg font-extrabold ${medal[i]}`}
          >
            {posOf(r)}º
          </div>
        </div>
      ))}
    </div>
  );
}

export function RankingView({
  rows,
  pneu,
  rodadas,
  titulo,
}: {
  rows: Row[];
  pneu: Pneu;
  rodadas: Rodada[];
  titulo: string;
}) {
  const [tab, setTab] = useState<"geral" | "rodada">("geral");
  const [rodadaId, setRodadaId] = useState<string>(rodadas.at(-1)?.id ?? "");
  const [pneuOpen, setPneuOpen] = useState(false);
  const [poster, setPoster] = useState(false);

  const rodada = rodadas.find((r) => r.id === rodadaId) ?? null;

  function shareGeral() {
    const linhas = rows.map((r) => `${r.posicao}. ${r.nome} — ${r.pontos} pts`);
    const pneuLinha = pneu ? `\n🛞 Pneu: ${pneu.nome} (${pneu.vezes}×)` : "";
    void shareText(`🏆 Ranking Geral — ${titulo}\n\n${linhas.join("\n")}${pneuLinha}`);
  }
  function shareRodada() {
    if (!rodada) return;
    const linhas = rodada.results.map((r) => `${r.pos}º ${r.nome} (${r.tierLabel}) +${r.pts}`);
    void shareText(`📋 Rodada ${rodada.numero} — ${titulo}\n\n${linhas.join("\n")}`);
  }

  const tabBtn = (v: "geral" | "rodada", label: string) => (
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
      <div className="flex gap-2">
        {tabBtn("geral", "Geral")}
        {tabBtn("rodada", "Por rodada")}
      </div>

      {tab === "geral" ? (
        rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            Ainda sem pontos. Encerre uma rodada para ver o ranking.
          </p>
        ) : (
          <>
            <Podium rows={rows} />

            <div className="flex gap-2">
              <button
                onClick={shareGeral}
                className="flex-1 rounded-xl bg-accent/15 py-2.5 text-sm font-semibold text-accent"
              >
                Compartilhar (texto)
              </button>
              <button
                onClick={() => setPoster((v) => !v)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${poster ? "bg-accent text-accent-ink" : "bg-accent/15 text-accent"}`}
              >
                {poster ? "Ocultar imagem" : "Imagem do ranking"}
              </button>
            </div>

            {poster && <RankingPoster titulo={titulo} rows={rows} />}

            {pneu && (
              <div className="overflow-hidden rounded-2xl border border-line bg-warning/10">
                <button
                  onClick={() => setPneuOpen((v) => !v)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="text-xl">🛞</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ink">Troféu Pneu</p>
                    <p className="text-xs text-muted">
                      {pneu.nome} · {pneu.vezes}× com 6×0
                    </p>
                  </div>
                  <span className={`text-muted transition-transform ${pneuOpen ? "rotate-90" : ""}`}>›</span>
                </button>
                {pneuOpen && (
                  <ul className="flex flex-col gap-1 border-t border-line/60 px-4 py-3">
                    {pneu.detalhes.length === 0 ? (
                      <li className="text-xs text-muted">Sem detalhes disponíveis.</li>
                    ) : (
                      pneu.detalhes.map((d, i) => (
                        <li key={i} className="text-xs text-ink">
                          <span className="font-semibold">
                            {d.rodada != null ? `Rodada ${d.rodada}` : "Rodada especial"}
                          </span>{" "}
                          <span className="text-muted">
                            — 6×0 para {d.adversarios} (dupla com {d.parceiro})
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            )}

            <ul className="flex flex-col gap-2">
              {rows.map((r) => (
                <li key={r.playerId}>
                  <Link
                    href={`/jogador/${r.playerId}`}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3"
                  >
                    <span className="w-6 text-center text-sm font-bold text-muted">{r.posicao}</span>
                    {r.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.photoUrl} alt={r.nome} className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ocean/15 text-xs font-bold text-ocean">
                        {initials(r.nome)}
                      </span>
                    )}
                    <span className="flex-1 truncate text-sm font-semibold text-ink">{r.nome}</span>
                    <span className={`text-xs font-bold ${VAR[r.variacao].cls}`}>
                      {VAR[r.variacao].icon}
                    </span>
                    <span className="w-12 text-right text-sm font-bold text-ink">{r.pontos}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )
      ) : (
        <>
          {rodadas.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Nenhuma rodada encerrada ainda.</p>
          ) : (
            <>
              <select
                value={rodadaId}
                onChange={(e) => setRodadaId(e.target.value)}
                className="rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink outline-none"
              >
                {rodadas.map((r) => (
                  <option key={r.id} value={r.id}>
                    Rodada {r.numero}
                  </option>
                ))}
              </select>

              {rodada && rodada.results.length > 0 && (
                <button
                  onClick={shareRodada}
                  className="rounded-xl bg-accent/15 py-2.5 text-sm font-semibold text-accent"
                >
                  Compartilhar no WhatsApp
                </button>
              )}

              {rodada && (
                <ul className="flex flex-col gap-2">
                  {rodada.results.map((r, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3"
                    >
                      <span className="w-6 text-center text-sm font-bold text-muted">{r.pos}º</span>
                      <span className="flex-1 truncate">
                        <span className="block text-sm font-semibold text-ink">{r.nome}</span>
                        <span className="block text-[11px] text-muted">{r.tierLabel}</span>
                      </span>
                      <span className="text-sm font-bold text-ink">+{r.pts}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
