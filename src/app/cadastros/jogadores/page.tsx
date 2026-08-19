import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { PlayersManager } from "@/components/PlayersManager";

export const dynamic = "force-dynamic";

export default async function JogadoresPage() {
  const players = await prisma.player.findMany({
    where: { active: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, email: true, photoUrl: true, type: true },
  });

  return (
    <AppShell title="Cadastros">
      <PlayersManager players={players} />
    </AppShell>
  );
}
