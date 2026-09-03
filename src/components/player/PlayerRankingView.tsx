"use client";

import { useState } from "react";
import { Avatar, initials } from "@/components/player/ui";

type Row = {
  posicao: number;
  playerId: string;
  nome: string;
  pontos: number;
  photoUrl: string | null;
  variacao: "up" | "down" | "same";
};
type Rodada = {
  id: string;
  numero: number;
  results: { pos: number; nome: string; tierLabel: string; pts: number; isMe: boolean }[];
};

const VAR: Record<Row["variacao"], [string, string]> = {
  up: ["▲", "text-success"],
  down: ["▼", "text-danger"],
  same: ["–", "text-muted"],
};
const primeiro = (n: string) => n.split(" ")[0];

function Podium({ rows }: { rows: Row[] }) {
  const top3 = rows.slice(0, 3);
  if (top3.length === 0) return null;
  const order = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;
  const medal = ["bg-silver/20 text-silver", "bg-gold/20 text-gold", "bg-bronze/20 text-bronze"];
  const heights = ["h-[78px]", "h-[108px]", "h-[62px]"];
  const posOf = (r: Row) => rows.findIndex((x) => x.playerId === r.playerId) + 1;

  return (
    <div className="mb-3 flex items-end justify-center gap-3">
      {order.map((r, i) => (
        <div key={r.playerId} className="flex w-[98px] flex-col items-center gap-1">
          {posOf(r) === 1 && (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className="text-gold">
              <path d="M8 4h8v4a4 4 0 0 1-8 0V4zM9 16h6M12 12v4M8 20h8" />
            </svg>
          )}
          <span className={`flex items-center justify-center rounded-full text-sm font-bold ${medal[i]} ${posOf(r) === 1 ? "h-[52px] w-[52px]" : "h-[46px] w-[46px]"}`}>
            {r.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.photoUrl} alt={r.nome} className="h-full w-full rounded-full object-cover" />
            ) : (
              initials(r.nome)
            )}
          </span>
          <p className="text-center text-[12px] font-bold leading-tight text-ink">{primeiro(r.nome)}</p>
          <p className="text-[10.5px] text-muted">{r.pontos.toLocaleString("pt-BR")} pts</p>
          <div className={`flex w-full ${heights[i]} items-start justify-center rounded-t-2xl pt-2 text-[18px] font-black ${medal[i]}`}>
            {posOf(r)}º
          </div>
        </div>
      ))}
    </div>
  );
}

export function PlayerRankingView({
  rows,
  rodadas,
  meId,
  titulo,
  subtitulo,
}: {
  rows: Row[];
  rodadas: Rodada[];
  meId: string;
  titulo: string;
  subtitulo: string;
}) {
  const [tab, setTab] = useState<"geral" | "rodada">("geral");
  const [rodadaId, setRodadaId] = useState<string>(rodadas.at(-1)?.id ?? "");
  const rodada = rodadas.find((r) => r.id === rodadaId) ?? null;

  const tabBtn = (v: "geral" | "rodada", label: string) => (
    <button
      onClick={() => setTab(v)}
      className={`flex-1 rounded-[14px] py-2.5 text-[13px] font-bold ${
        tab === v ? "bg-accent text-accent-ink" : "border border-line bg-card text-muted"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <h1 className="text-[20px] font-extrabold text-ink">{titulo}</h1>
      <p className="mb-3 text-[12px] text-muted">{subtitulo}</p>

      <div className="mb-4 flex gap-2">
        {tabBtn("geral", "Geral")}
        {tabBtn("rodada", "Por rodada")}
      </div>

      {tab === "geral" ? (
        rows.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-muted">
            A organização ainda não encerrou nenhuma rodada.
          </p>
        ) : (
          <>
            <Podium rows={rows} />
            <ul className="flex flex-col gap-2">
              {rows.map((r) => {
                const isMe = r.playerId === meId;
                return (
                  <li
                    key={r.playerId}
                    className={`flex items-center gap-3 rounded-[20px] px-3.5 py-3 ${
                      isMe ? "border-[1.5px] border-accent bg-accent/10" : "border border-line bg-card"
                    }`}
                  >
                    <span className={`w-5 text-center text-[13px] font-extrabold ${isMe ? "text-accent" : "text-muted"}`}>
                      {r.posicao}
                    </span>
                    <Avatar nome={r.nome} foto={r.photoUrl} size={36} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink">
                      {r.nome}
                      {isMe && (
                        <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 align-middle text-[9px] font-extrabold tracking-[.06em] text-accent-ink">
                          VOCÊ
                        </span>
                      )}
                    </span>
                    <span className={`text-[11px] font-extrabold ${VAR[r.variacao][1]}`}>{VAR[r.variacao][0]}</span>
                    <span className="w-12 text-right text-[14px] font-extrabold text-ink">
                      {r.pontos.toLocaleString("pt-BR")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )
      ) : rodadas.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-muted">Nenhuma rodada encerrada ainda.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <select
            value={rodadaId}
            onChange={(e) => setRodadaId(e.target.value)}
            className="rounded-[16px] border border-line bg-card px-4 py-3 text-[13px] text-ink outline-none"
          >
            {rodadas.map((r) => (
              <option key={r.id} value={r.id}>
                Rodada {r.numero}
              </option>
            ))}
          </select>
          {rodada && (
            <ul className="flex flex-col gap-2">
              {rodada.results.map((r, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-3 rounded-[20px] px-3.5 py-3 ${
                    r.isMe ? "border-[1.5px] border-accent bg-accent/10" : "border border-line bg-card"
                  } ${i === 0 && !r.isMe ? "border-gold/30" : ""}`}
                >
                  <span className={`w-6 text-center text-[13px] font-extrabold ${r.isMe ? "text-accent" : "text-muted"}`}>
                    {r.pos}º
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="block text-[13px] font-semibold text-ink">
                      {r.nome}
                      {r.isMe && (
                        <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 align-middle text-[9px] font-extrabold text-accent-ink">
                          VOCÊ
                        </span>
                      )}
                    </span>
                    <span className="block text-[11px] text-muted">{r.tierLabel}</span>
                  </span>
                  <span className="text-[13px] font-extrabold text-ink">+{r.pts}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
