"use client";

import { useState } from "react";

/** Botão "?" ao lado do Rating que abre uma folha explicando como ele funciona. */
export function RatingInfo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Como funciona o Rating"
        className="ml-1.5 inline-flex h-[16px] w-[16px] items-center justify-center rounded-full bg-muted/20 align-middle text-[10px] font-black text-muted"
      >
        ?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[440px] rounded-t-[24px] border border-line bg-card p-5 pb-7 shadow-xl sm:rounded-[24px] animate-[posterIn_.25s_ease]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[16px] font-black text-ink">Como funciona o Rating 🎾</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-muted/15 text-[15px] font-bold text-muted"
              >
                ✕
              </button>
            </div>

            <p className="text-[12.5px] leading-relaxed text-ink">
              É a sua <b>nota de força</b>, no estilo do rating do xadrez ou do FIFA. Todo mundo começa em{" "}
              <b>1000</b> e o número sobe ou desce a cada jogo.
            </p>

            <div className="mt-3 flex flex-col gap-2">
              <Item icon="✅" titulo="Vence, sobe. Perde, cai.">
                Cada jogo (grupos e mata-mata) mexe no seu número.
              </Item>
              <Item icon="💪" titulo="Contra quem importa">
                Vencer uma dupla <b>mais forte</b> vale mais pontos. Ser zebra e ganhar rende muito; perder para quem
                era mais fraco custa mais.
              </Item>
              <Item icon="🎯" titulo="O placar não conta">
                Ganhar de 6/0 ou de 7/6 dá a mesma variação — o que pesa é <b>quem venceu</b>, não a diferença de
                games. (O saldo de games você vê nos outros indicadores.)
              </Item>
              <Item icon="🔄" titulo="Sempre recalculado">
                O rating é refeito a partir de todo o histórico. Não fica viciado, e se um resultado for corrigido ele
                se ajusta sozinho.
              </Item>
            </div>

            <p className="mb-1.5 mt-4 text-[9.5px] tracking-[.1em] text-muted">NÍVEIS</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                ["Em ascensão", "até 969"],
                ["Intermediário", "970+"],
                ["Avançado", "1060+"],
                ["Elite", "1150+"],
              ].map(([n, faixa]) => (
                <span key={n} className="rounded-full border border-line bg-surface px-2.5 py-1 text-[10.5px] font-bold text-ink">
                  {n} <span className="text-muted">· {faixa}</span>
                </span>
              ))}
            </div>

            <p className="mt-4 rounded-[14px] bg-accent/10 px-3 py-2.5 text-[11.5px] font-semibold text-accent">
              Em uma frase: sobe quando você vence (principalmente contra os fortes) e cai quando perde — o placar não
              importa, só quem ganhou.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function Item({ icon, titulo, children }: { icon: string; titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-[14px] border border-line bg-surface px-3 py-2.5">
      <span className="text-[16px] leading-none">{icon}</span>
      <div>
        <p className="text-[12px] font-extrabold text-ink">{titulo}</p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{children}</p>
      </div>
    </div>
  );
}
