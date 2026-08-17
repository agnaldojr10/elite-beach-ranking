import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { RoundConsole } from "@/components/RoundConsole";

export const dynamic = "force-dynamic";

const primeiro = (nome: string) => nome.split(" ")[0];

export default async function RodadaPage({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { id: true, numero: true, data: true, status: true, peso: true, isFinals: true },
  });
  if (!round) notFound();

  const [attendances, eligibles, teams] = await Promise.all([
    prisma.attendance.findMany({ where: { roundId }, select: { playerId: true } }),
    prisma.player.findMany({
      where: { active: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, type: true },
    }),
    prisma.team.findMany({
      where: { roundId },
      orderBy: { grupo: "asc" },
      select: {
        id: true,
        grupo: true,
        player1: { select: { nome: true } },
        player2: { select: { nome: true } },
      },
    }),
  ]);

  const presentes = attendances.map((a) => a.playerId);

  const gruposMap = new Map<string, { id: string; label: string }[]>();
  for (const t of teams) {
    const g = t.grupo ?? "A";
    if (!gruposMap.has(g)) gruposMap.set(g, []);
    gruposMap.get(g)!.push({
      id: t.id,
      label: `${primeiro(t.player1.nome)} & ${primeiro(t.player2.nome)}`,
    });
  }
  const grupos = [...gruposMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, duplas]) => ({ label, duplas }));

  return (
    <AppShell title={round.isFinals ? "FINALS" : `Rodada ${round.numero}`}>
      <Link href="/sorteio" className="mb-3 inline-block text-sm text-ocean">
        ‹ Rodadas
      </Link>

      {round.isFinals ? (
        <div className="rounded-2xl border border-line bg-card p-5 text-sm text-muted">
          A FINALS é sorteada no papel. Em breve: lista dos 12 classificados e registro do pódio.
        </div>
      ) : (
        <RoundConsole
          roundId={round.id}
          status={round.status}
          presentes={presentes}
          eligibles={eligibles}
          grupos={grupos}
        />
      )}
    </AppShell>
  );
}
