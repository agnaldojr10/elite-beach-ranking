import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { SuperManager } from "@/components/SuperManager";

export const dynamic = "force-dynamic";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function TorneiosPage() {
  const [torneios, players] = await Promise.all([
    prisma.superTournament.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nome: true,
        data: true,
        size: true,
        status: true,
        _count: { select: { players: true } },
      },
    }),
    prisma.player.findMany({
      where: { active: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, photoUrl: true, type: true },
    }),
  ]);

  const lista = torneios.map((t) => ({
    id: t.id,
    nome: t.nome,
    data: iso(t.data),
    size: t.size,
    status: t.status,
    inscritos: t._count.players,
  }));

  return (
    <AppShell title="Torneios">
      <SuperManager torneios={lista} players={players} />
    </AppShell>
  );
}
