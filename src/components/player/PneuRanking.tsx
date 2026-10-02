"use client";

import { useState } from "react";
import { Avatar } from "@/components/player/ui";

type Detalhe = { rodada: number | null; adversarios: string; parceiro: string };
export type PneuRankRow = { playerId: string; nome: string; photoUrl: string | null; vezes: number; detalhes: Detalhe[] };

/** Ranking do Pneu (6×0 sofridos) — todos os atletas, acumulando. */
export function PneuRanking({ rows, meId }: { rows: PneuRankRow[]; meId?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  if (rows.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="mb-2 text-[9.5px] tracking-[.1em] text-muted">🛞 RANKING DO PNEU</p>
      <div className="overflow-hidden rounded-[18px] border border-line bg-card">
        {rows.map((p, i) => {
          const isMe = p.playerId === meId;
          const aberto = open === p.playerId;
          return (
            <div key={p.playerId} className={`border-b border-line last:border-0 ${isMe ? "bg-accent/5" : ""}`}>
              <button
                onClick={() => setOpen((d) => (d === p.playerId ? null : p.playerId))}
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
              >
                <span className="w-5 text-center text-[12px] font-black text-muted">{i + 1}</span>
                <Avatar nome={p.nome} foto={p.photoUrl} size={30} />
                <span className="flex-1 truncate text-[12.5px] font-semibold text-ink">
                  {p.nome}
                  {isMe && <span className="ml-1 text-[10px] font-bold text-accent">· você</span>}
                </span>
                <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[11px] font-black text-ink">
                  {p.vezes}× 🛞
                </span>
                <span className={`text-muted transition-transform ${aberto ? "rotate-90" : ""}`}>›</span>
              </button>
              {aberto && (
                <ul className="flex flex-col gap-1 px-11 pb-2.5">
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
