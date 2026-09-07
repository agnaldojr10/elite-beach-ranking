import Link from "next/link";
import { requirePlayer } from "@/lib/auth-guard";
import { getPlayerRankingData } from "@/server/player.service";
import { getChampionshipRecords } from "@/server/stats.service";
import { PlayerShell } from "@/components/player/PlayerShell";
import { PlayerRankingView } from "@/components/player/PlayerRankingView";

export const dynamic = "force-dynamic";

export default async function ClassificacaoPage() {
  const { playerId } = await requirePlayer();
  const [data, records] = await Promise.all([getPlayerRankingData(playerId), getChampionshipRecords()]);

  if (!data.championship) {
    return (
      <PlayerShell>
        <h1 className="pt-3 text-[20px] font-extrabold text-ink">Ranking</h1>
        <p className="mt-4 rounded-2xl border border-line bg-card p-4 text-[12.5px] text-muted">
          Nenhum campeonato ativo no momento.
        </p>
      </PlayerShell>
    );
  }

  return (
    <PlayerShell>
      <div className="pt-3">
        <PlayerRankingView
          rows={data.rows}
          rodadas={data.rodadas}
          meId={playerId}
          titulo="Ranking"
          subtitulo={`${data.championship.nome} · ${data.rodadasEncerradas} de ${data.totalRodadas} rodadas`}
        />

        <Link
          href="/comparar"
          className="mt-4 flex items-center justify-between rounded-[18px] border border-line bg-card px-4 py-3.5"
        >
          <span className="text-[12.5px] font-extrabold text-ink">⚔️ Comparar atletas</span>
          <span className="text-[11px] font-semibold text-accent">abrir →</span>
        </Link>

        {records.recordes.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[9.5px] tracking-[.1em] text-muted">RECORDES DO CAMPEONATO</p>
            <div className="grid grid-cols-2 gap-2.5">
              {records.recordes.map((r, i) => (
                <div key={i} className="rounded-[18px] border border-line bg-card p-3.5">
                  <p className="text-[9.5px] tracking-[.1em] text-muted">
                    {r.icon} {r.label.toUpperCase()}
                  </p>
                  <p className="mt-1 truncate text-[14px] font-black text-ink">{r.nome}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-accent">{r.valor}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PlayerShell>
  );
}
