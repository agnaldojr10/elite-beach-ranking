import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { RoundConsole } from "@/components/RoundConsole";
import { buildGroupStandings, groupsComplete } from "@/server/knockout.service";

export const dynamic = "force-dynamic";

const primeiro = (nome: string) => nome.split(" ")[0];

const KO_ORDER: Record<string, number> = { QUARTAS: 0, SEMIFINAL: 1, FINAL: 2, TERCEIRO: 3 };
const KO_LABEL: Record<string, string> = {
  QUARTAS: "Quartas de final",
  SEMIFINAL: "Semifinal",
  FINAL: "Final",
  TERCEIRO: "Disputa de 3º lugar",
};

export default async function RodadaPage({ params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { id: true, numero: true, data: true, status: true, peso: true, isFinals: true },
  });
  if (!round) notFound();

  const [attendances, eligibles, teams, matches] = await Promise.all([
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
    prisma.match.findMany({
      where: { roundId },
      select: {
        id: true,
        phase: true,
        grupo: true,
        slot: true,
        teamAId: true,
        teamBId: true,
        scoreA: true,
        scoreB: true,
      },
    }),
  ]);

  const presentes = attendances.map((a) => a.playerId);
  const teamLabel = new Map(
    teams.map((t) => [t.id, `${primeiro(t.player1.nome)} & ${primeiro(t.player2.nome)}`]),
  );

  // Grupos: duplas + jogos + classificação
  const standings = teams.length > 0 ? await buildGroupStandings(roundId) : [];
  const standingsByGroup = new Map(standings.map((g) => [g.groupName, g.standings]));
  const grupoLabels = [...new Set(teams.map((t) => t.grupo ?? "A"))].sort();

  const grupos = grupoLabels.map((label) => ({
    label,
    duplas: teams
      .filter((t) => (t.grupo ?? "A") === label)
      .map((t) => ({ id: t.id, label: teamLabel.get(t.id) ?? "" })),
    jogos: matches
      .filter((m) => m.phase === "GRUPOS" && (m.grupo ?? "A") === label)
      .map((m) => ({
        matchId: m.id,
        labelA: teamLabel.get(m.teamAId) ?? "",
        labelB: teamLabel.get(m.teamBId) ?? "",
        scoreA: m.scoreA,
        scoreB: m.scoreB,
      })),
    classificacao: (standingsByGroup.get(label) ?? []).map((s) => ({
      label: teamLabel.get(s.teamId) ?? "",
      wins: s.wins,
      saldo: s.gamesBalance,
    })),
  }));

  // Mata-mata
  const mataMata = matches
    .filter((m) => m.phase !== "GRUPOS")
    .sort((a, b) => (KO_ORDER[a.phase] - KO_ORDER[b.phase]) || (a.slot ?? 0) - (b.slot ?? 0))
    .map((m) => ({
      matchId: m.id,
      phaseLabel: KO_LABEL[m.phase] ?? m.phase,
      labelA: teamLabel.get(m.teamAId) ?? "",
      labelB: teamLabel.get(m.teamBId) ?? "",
      scoreA: m.scoreA,
      scoreB: m.scoreB,
    }));

  const finalM = matches.find((m) => m.phase === "FINAL");
  const podeEncerrar =
    !!finalM && finalM.scoreA != null && finalM.scoreB != null && finalM.scoreA !== finalM.scoreB;

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
          mataMata={mataMata}
          gruposCompletos={await groupsComplete(roundId)}
          podeEncerrar={podeEncerrar}
          encerrada={round.status === "ENCERRADA"}
        />
      )}
    </AppShell>
  );
}
