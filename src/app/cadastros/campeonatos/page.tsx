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
      bannerUrl: true,
      logoUrl: true,
      ptsParticipacao: true,
      ptsQuartas: true,
      pts4: true,
      pts3: true,
      ptsVice: true,
      ptsCampeao: true,
      lastRoundDouble: true,
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
    bannerUrl: c.bannerUrl,
    logoUrl: c.logoUrl,
    ptsParticipacao: c.ptsParticipacao,
    ptsQuartas: c.ptsQuartas,
    pts4: c.pts4,
    pts3: c.pts3,
    ptsVice: c.ptsVice,
    ptsCampeao: c.ptsCampeao,
    lastRoundDouble: c.lastRoundDouble,
  }));

  return (
    <AppShell title="Cadastros">
      <ChampionshipsManager campeonatos={campeonatos} />
    </AppShell>
  );
}
