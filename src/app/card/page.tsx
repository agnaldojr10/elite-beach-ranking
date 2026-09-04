import Link from "next/link";
import { requirePlayer } from "@/lib/auth-guard";
import { getPlayerHome, getPlayerDesempenho } from "@/server/player.service";
import { PlayerShell, PlayerIcon } from "@/components/player/PlayerShell";
import { PlayerCardCanvas } from "@/components/player/PlayerCardCanvas";

export const dynamic = "force-dynamic";

export default async function CardPage() {
  const { playerId } = await requirePlayer();
  const [home, d] = await Promise.all([getPlayerHome(playerId), getPlayerDesempenho(playerId)]);

  return (
    <PlayerShell>
      <div className="pt-3">
        <header className="mb-4 flex items-center gap-3">
          <Link href="/inicio" className="flex h-[38px] w-[38px] items-center justify-center rounded-[14px] border border-line bg-card text-ink">
            <PlayerIcon size={18}><path d="M15 5l-7 7 7 7" /></PlayerIcon>
          </Link>
          <h1 className="text-[18px] font-extrabold text-ink">Meu card</h1>
        </header>

        <PlayerCardCanvas
          data={{
            nome: home.player.nome,
            clube: home.player.clube,
            posicao: home.me?.posicao ?? null,
            vitorias: d.vitorias,
            saldo: d.saldo,
            gamesPro: d.gamesPro,
            pontos: d.pontos,
            titulos: d.trofeus.titulos,
            podios: d.trofeus.podios,
            photoUrl: home.player.photoUrl,
          }}
        />
      </div>
    </PlayerShell>
  );
}
