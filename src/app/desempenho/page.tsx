import Link from "next/link";
import { requirePlayer } from "@/lib/auth-guard";
import { getPlayerDesempenho } from "@/server/player.service";
import { PlayerShell, PlayerIcon } from "@/components/player/PlayerShell";
import { Avatar } from "@/components/player/ui";

export const dynamic = "force-dynamic";

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-[20px] border border-line bg-card p-3.5">
      <p className="text-[9.5px] tracking-[.1em] text-muted">{label}</p>
      <p className={`mt-1.5 text-[26px] font-black leading-none tracking-[-.02em] ${tone ?? "text-ink"}`}>{value}</p>
      {hint && <p className="mt-1.5 text-[10.5px] text-muted">{hint}</p>}
    </div>
  );
}

export default async function DesempenhoPage() {
  const { playerId } = await requirePlayer();
  const d = await getPlayerDesempenho(playerId);

  if (!d.championship) {
    return (
      <PlayerShell>
        <h1 className="pt-3 text-[20px] font-extrabold text-ink">Meu desempenho</h1>
        <p className="mt-4 rounded-2xl border border-line bg-card p-4 text-[12.5px] text-muted">
          Nenhum campeonato ativo no momento.
        </p>
      </PlayerShell>
    );
  }

  const maxPts = Math.max(1, ...d.etapas.map((e) => e.pts));

  return (
    <PlayerShell>
      <h1 className="mb-4 pt-3 text-[20px] font-extrabold text-ink">Meu desempenho</h1>

      <div className="grid grid-cols-2 gap-2.5">
        <Stat
          label="PONTOS"
          value={d.pontos.toLocaleString("pt-BR")}
          hint={d.deltaUltima != null ? `+${d.deltaUltima} na última` : undefined}
          tone="text-ink"
        />
        <Stat label="MELHOR RESULTADO" value={d.melhorTierLabel ?? "—"} tone="text-gold" />
        <Stat label="VITÓRIAS" value={String(d.vitorias)} hint={`${d.aproveitamento}% de aproveitamento`} />
        <Stat
          label="SALDO DE GAMES"
          value={`${d.saldo >= 0 ? "+" : ""}${d.saldo}`}
          tone={d.saldo >= 0 ? "text-success" : "text-danger"}
        />
      </div>

      {d.etapas.length > 0 && (
        <div className="mt-3 rounded-[24px] border border-line bg-card p-4">
          <p className="mb-3 text-[9.5px] tracking-[.1em] text-muted">PONTOS POR ETAPA</p>
          <div className="flex items-end gap-1.5" style={{ height: 96 }}>
            {d.etapas.map((e, i) => {
              const h = Math.max(6, Math.round((e.pts / maxPts) * 78));
              const last = i === d.etapas.length - 1;
              return (
                <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="font-mono text-[9.5px] text-muted">{e.pts}</span>
                  <div
                    className={`w-full rounded-t-lg ${last ? "bg-accent" : "bg-ocean/40"}`}
                    style={{ height: h }}
                  />
                  <span className="text-[9px] text-muted">{e.numero}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {d.historico.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-[9.5px] tracking-[.1em] text-muted">HISTÓRICO POR RODADA</p>
          <div className="flex flex-col gap-2">
            {d.historico.map((h, i) => (
              <Link
                key={i}
                href={`/rodada?r=${h.roundId}`}
                className="flex items-center gap-3 rounded-[18px] border border-line bg-card px-3.5 py-3"
              >
                <span className="w-[62px] text-[12.5px] font-extrabold text-ink">Rodada {h.numero}</span>
                <span className="flex-1 truncate text-[11.5px] text-muted">{h.tierLabel}</span>
                <span className={`text-[13px] font-extrabold ${h.pts > 10 ? "text-success" : "text-ink"}`}>+{h.pts}</span>
                <span className="text-muted">
                  <PlayerIcon size={16}><path d="M9 5l7 7-7 7" /></PlayerIcon>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {d.parceiros.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[9.5px] tracking-[.1em] text-muted">PARCEIROS MAIS FREQUENTES</p>
          <div className="flex flex-col gap-2">
            {d.parceiros.map((p, i) => (
              <div key={i} className="flex items-center gap-3 rounded-[18px] border border-line bg-card px-3.5 py-2.5">
                <Avatar nome={p.nome} size={28} />
                <span className="flex-1 truncate text-[11.5px] font-semibold text-ink">{p.nome}</span>
                <span className="text-[11.5px] font-extrabold text-muted">{p.vezes}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {[
          ["título", d.trofeus.titulos, "text-gold"],
          ["pódios", d.trofeus.podios, "text-silver"],
          ["pneu", d.trofeus.pneu, "text-bronze"],
        ].map(([label, val, tone]) => (
          <div key={String(label)} className="rounded-[18px] border border-line bg-card p-3 text-center">
            <p className={`text-[22px] font-black ${tone as string}`}>{val as number}</p>
            <p className="text-[10.5px] text-muted">{label as string}</p>
          </div>
        ))}
      </div>
      {d.pneuDetalhe && <p className="mt-2 text-center text-[10.5px] text-muted">{d.pneuDetalhe}</p>}
    </PlayerShell>
  );
}
