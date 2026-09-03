import { requirePlayer } from "@/lib/auth-guard";
import { getPlayerRankingData } from "@/server/player.service";
import { PlayerShell } from "@/components/player/PlayerShell";
import { PlayerRankingView } from "@/components/player/PlayerRankingView";

export const dynamic = "force-dynamic";

export default async function ClassificacaoPage() {
  const { playerId } = await requirePlayer();
  const data = await getPlayerRankingData(playerId);

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
      </div>
    </PlayerShell>
  );
}
