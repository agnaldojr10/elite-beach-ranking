import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { SuperConsole } from "@/components/SuperConsole";
import { getSuperStandings } from "@/server/super.service";

export const dynamic = "force-dynamic";

export default async function TorneioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const t = await prisma.superTournament.findUnique({
    where: { id },
    include: {
      players: { include: { player: { select: { nome: true } } } },
      matches: { orderBy: [{ rodada: "asc" }, { quadra: "asc" }] },
    },
  });
  if (!t) notFound();

  const nameBySeat = new Map(t.players.map((p) => [p.seat, p.player.nome]));
  const dupla = (x: number, y: number) => `${nameBySeat.get(x) ?? "?"} & ${nameBySeat.get(y) ?? "?"}`;

  const byRound = new Map<
    number,
    { rodada: number; jogos: { matchId: string; quadra: number; labelA: string; labelB: string; scoreA: number | null; scoreB: number | null }[] }
  >();
  for (const m of t.matches) {
    if (!byRound.has(m.rodada)) byRound.set(m.rodada, { rodada: m.rodada, jogos: [] });
    byRound.get(m.rodada)!.jogos.push({
      matchId: m.id,
      quadra: m.quadra,
      labelA: dupla(m.a1, m.a2),
      labelB: dupla(m.b1, m.b2),
      scoreA: m.scoreA,
      scoreB: m.scoreB,
    });
  }
  const rodadas = [...byRound.values()].sort((a, b) => a.rodada - b.rodada);

  const standings = await getSuperStandings(id);

  return (
    <AppShell title={`Super ${t.size}`}>
      <Link href="/torneios" className="mb-3 inline-block text-sm text-ocean">
        ‹ Torneios
      </Link>
      <SuperConsole
        tournamentId={t.id}
        nome={t.nome}
        size={t.size}
        gamesPerMatch={t.gamesPerMatch}
        status={t.status}
        rodadas={rodadas}
        standings={standings}
      />
    </AppShell>
  );
}
