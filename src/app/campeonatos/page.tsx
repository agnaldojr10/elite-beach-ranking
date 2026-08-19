import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { ChampionshipPicker } from "@/components/ChampionshipPicker";
import { resolveActiveChampionship } from "@/lib/active-champ";

export const dynamic = "force-dynamic";

export default async function CampeonatosPage() {
  const [todos, { champ: atual }] = await Promise.all([
    prisma.championship.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nome: true,
        temporada: true,
        status: true,
        bannerUrl: true,
        logoUrl: true,
      },
    }),
    resolveActiveChampionship(),
  ]);

  const campeonatos = todos.map((c) => ({
    id: c.id,
    nome: c.nome,
    temporada: c.temporada,
    status: c.status,
    bannerUrl: c.bannerUrl,
    logoUrl: c.logoUrl,
    selecionado: atual?.id === c.id,
  }));

  return (
    <AppShell title="Campeonatos">
      <p className="mb-4 text-sm text-muted">Selecione o campeonato que deseja acompanhar.</p>
      <ChampionshipPicker campeonatos={campeonatos} />
    </AppShell>
  );
}
