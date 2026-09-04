import { signOut } from "@/auth";
import { requirePlayer } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { PlayerShell } from "@/components/player/PlayerShell";
import { PerfilClient } from "@/components/player/PerfilClient";
import { NotifToggle } from "@/components/player/NotifToggle";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const { playerId } = await requirePlayer();
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { nome: true, clube: true, photoUrl: true, loginContact: true },
  });

  return (
    <PlayerShell>
      <h1 className="mb-4 pt-3 text-[20px] font-extrabold text-ink">Perfil</h1>

      <PerfilClient nome={player?.nome ?? ""} clube={player?.clube ?? null} foto={player?.photoUrl ?? null} />

      <div className="mt-4 flex items-center justify-between rounded-[20px] border border-line bg-card px-4 py-3.5">
        <div>
          <p className="text-[13.5px] font-semibold text-ink">Tema</p>
          <p className="text-[11px] text-muted">Claro ou escuro</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="mt-3 flex items-center justify-between rounded-[20px] border border-line bg-card px-4 py-3.5">
        <div>
          <p className="text-[13.5px] font-semibold text-ink">Notificações</p>
          <p className="text-[11px] text-muted">Avisos de sorteio e dos seus jogos</p>
        </div>
        <NotifToggle />
      </div>

      {player?.loginContact && (
        <p className="mt-4 text-center text-[11px] text-muted">Login: {player.loginContact}</p>
      )}

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
        className="mt-4"
      >
        <button className="w-full rounded-full border border-danger/35 bg-danger/[.08] py-3 text-[13.5px] font-extrabold text-danger">
          Sair
        </button>
      </form>
      <p className="mt-5 text-center text-[11px] text-muted">Elite Beach Ranking · PWA</p>
    </PlayerShell>
  );
}
