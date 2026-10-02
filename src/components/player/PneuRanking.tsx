"use client";

import { useState } from "react";
import { Avatar } from "@/components/player/ui";

type Detalhe = { rodada: number | null; adversarios: string; parceiro: string };
export type PneuRankRow = { playerId: string; nome: string; photoUrl: string | null; vezes: number; detalhes: Detalhe[] };

/** Troféu Pneu (6×0 sofridos) — lista de todos, fechada atrás de um clique. */
export function PneuRanking({ rows, meId }: { rows: PneuRankRow[]; meId?: string }) {
  const [open, setOpen] = useState(false);
  const [det, setDet] = useState<string | null>(null);
  if (rows.length === 0) return null;
  const lider = rows[0];

  return (
    <div className="mt-4 overflow-hidden rounded-[18px] border border-line bg-warning/10">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="text-[20px]">🛞</span>
        <div className="flex-1">
          <p className="text-[13px] font-extrabold text-ink">Troféu Pneu</p>
          <p className="text-[11px] text-muted">
            {rows.length} {rows.length === 1 ? "jogador" : "jogadores"} · líder {lider.nome} ({lider.vezes}×)
          </p>
        </div>
        <span className={`text-muted transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>

      {open && (
        <ul className="flex flex-col gap-0.5 border-t border-line/60 p-2">
          {rows.map((p, i) => {
            const isMe = p.playerId === meId;
            const aberto = det === p.playerId;
            return (
              <li key={p.playerId} className={isMe ? "rounded-xl bg-accent/5" : ""}>
                <button
                  onClick={() => setDet((d) => (d === p.playerId ? null : p.playerId))}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left"
                >
                  <span className="w-5 text-center text-[12px] font-black text-muted">{i + 1}</span>
                  <Avatar nome={p.nome} foto={p.photoUrl} size={28} />
                  <span className="flex-1 truncate text-[12px] font-semibold text-ink">
                    {p.nome}
                    {isMe && <span className="ml-1 text-[10px] font-bold text-accent">· você</span>}
                  </span>
                  <span className="rounded-full bg-warning/25 px-2 py-0.5 text-[11px] font-black text-ink">
                    {p.vezes}× 🛞
                  </span>
                  <span className={`text-muted transition-transform ${aberto ? "rotate-90" : ""}`}>›</span>
                </button>
                {aberto && (
                  <ul className="flex flex-col gap-1 px-10 pb-2 pt-0.5">
                    {p.detalhes.map((d, j) => (
                      <li key={j} className="text-[11px] text-muted">
                        <span className="font-semibold text-ink">
                          {d.rodada != null ? `Rodada ${d.rodada}` : "Rodada especial"}
                        </span>{" "}
                        — 6×0 para {d.adversarios} (dupla com {d.parceiro})
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
