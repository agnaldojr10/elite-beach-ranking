import { requirePlayer } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { PlayerShell } from "@/components/player/PlayerShell";

export const dynamic = "force-dynamic";

const primeiro = (nome: string) => nome.trim().split(/\s+/)[0];

export default async function InicioPage() {
  const { playerId } = await requirePlayer();
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { nome: true, clube: true },
  });

  return (
    <PlayerShell>
      <header className="mb-5 pt-3">
        <p className="text-[19px] font-extrabold text-ink">Olá, {primeiro(player?.nome ?? "atleta")}</p>
        {player?.clube && <p className="text-[12px] text-muted">{player.clube}</p>}
      </header>

      <div className="rounded-[26px] border border-dashed border-white/15 bg-white/[.02] px-5 py-8 text-center">
        <p className="text-[16px] font-extrabold text-ink">Sua área está chegando</p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          Seu ranking, jogos, desempenho e card compartilhável aparecem aqui em breve.
        </p>
      </div>
    </PlayerShell>
  );
}
