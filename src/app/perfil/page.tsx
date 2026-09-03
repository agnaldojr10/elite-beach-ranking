import { signOut } from "@/auth";
import { requirePlayer } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { PlayerShell } from "@/components/player/PlayerShell";

export const dynamic = "force-dynamic";

const initials = (nome: string) => {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
};

export default async function PerfilPage() {
  const { playerId } = await requirePlayer();
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { nome: true, clube: true, photoUrl: true, loginContact: true },
  });

  return (
    <PlayerShell>
      <h1 className="mb-4 pt-3 text-[20px] font-extrabold text-ink">Perfil</h1>

      <div className="flex flex-col items-center rounded-[26px] border border-line bg-card p-6 text-center">
        {player?.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.photoUrl} alt={player.nome} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-ocean/15 text-xl font-bold text-ocean">
            {initials(player?.nome ?? "")}
          </span>
        )}
        <p className="mt-3 text-[18px] font-extrabold text-ink">{player?.nome}</p>
        {player?.clube && <p className="text-[12px] text-muted">{player.clube}</p>}
        {player?.loginContact && <p className="mt-1 text-[11.5px] text-muted">{player.loginContact}</p>}
      </div>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/entrar" });
        }}
        className="mt-5"
      >
        <button className="w-full rounded-full border border-danger/35 bg-danger/[.08] py-3 text-[13.5px] font-extrabold text-danger">
          Sair
        </button>
      </form>
      <p className="mt-5 text-center text-[11px] text-muted">Elite Beach Ranking · PWA</p>
    </PlayerShell>
  );
}
