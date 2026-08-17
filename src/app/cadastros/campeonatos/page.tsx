import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { ChampionshipsManager } from "@/components/ChampionshipsManager";

export const dynamic = "force-dynamic";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function CampeonatosPage() {
  const rows = await prisma.championship.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nome: true,
      temporada: true,
      formato: true,
      status: true,
      inicio: true,
      fim: true,
      finalsDate: true,
    },
  });

  const campeonatos = rows.map((c) => ({
    id: c.id,
    nome: c.nome,
    temporada: c.temporada,
    formato: c.formato,
    status: c.status,
    inicio: iso(c.inicio),
    fim: iso(c.fim),
    finalsDate: iso(c.finalsDate),
  }));

  return (
    <AppShell title="Cadastros">
      <ChampionshipsManager campeonatos={campeonatos} />
    </AppShell>
  );
}
