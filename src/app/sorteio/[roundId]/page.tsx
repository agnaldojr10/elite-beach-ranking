import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { RoundConsole } from "@/components/RoundConsole";
import { RoundSummaryCard } from "@/components/RoundSummaryCard";
import { FinalsConsole } from "@/components/FinalsConsole";
import { buildGroupStandings, groupsComplete } from "@/server/knockout.service";
import { getRankingGeral } from "@/server/ranking.service";

export const dynamic = "force-dynamic";

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
    select: {
      id: true,
      championshipId: true,
      numero: true,
      data: true,
      status: true,
      peso: true,
      isFinals: true,
      drawGroupSize: true,
      drawBalanceByRanking: true,
      drawAvoidRepeat: true,
      drawRandomness: true,
      configConfirmed: true,
      duplasConfirmed: true,
    },
  });
  if (!round) notFound();

  // FINALS: sorteio no papel — app lista os 12 classificados e registra o pódio.
  if (round.isFinals) {
    const { rows } = await getRankingGeral(round.championshipId);
    const classificados = rows.slice(0, 12).map((r) => ({ playerId: r.playerId, nome: r.nome }));
    const pod = await prisma.roundResult.findMany({
      where: { roundId },
      select: { tier: true, player: { select: { nome: true } } },
    });
    const registrado =
      pod.length > 0
        ? pod.map((p) => ({ tier: p.tier as "CAMPEAO" | "VICE" | "TERCEIRO", nome: p.player.nome }))
        : null;
    return (
      <AppShell title="FINALS">
        <Link href="/sorteio" className="mb-3 inline-block text-sm text-ocean">
          ‹ Rodadas
        </Link>
        <FinalsConsole roundId={round.id} classificados={classificados} registrado={registrado} />
      </AppShell>
    );
  }

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
    teams.map((t) => [t.id, `${t.player1.nome} & ${t.player2.nome}`]),
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

  const resolved = (m?: { scoreA: number | null; scoreB: number | null }) =>
    !!m && m.scoreA != null && m.scoreB != null && m.scoreA !== m.scoreB;
  const finalM = matches.find((m) => m.phase === "FINAL");
  const terceiroM = matches.find((m) => m.phase === "TERCEIRO");
  const jogosCompletos = resolved(finalM) && (terceiroM ? resolved(terceiroM) : true);

  return (
    <AppShell title={`Rodada ${round.numero}`}>
      <Link href="/sorteio" className="mb-3 inline-block text-sm text-ocean">
        ‹ Rodadas
      </Link>

      <RoundSummaryCard
        roundId={round.id}
        numero={round.numero}
        data={round.data.toISOString()}
        status={round.status as "ABERTA" | "SORTEADA" | "ENCERRADA" | "AGENDADA"}
        peso={round.peso}
      />

      <RoundConsole
        roundId={round.id}
        presentes={presentes}
        eligibles={eligibles}
        config={{
          groupSize: round.drawGroupSize,
          balanceByRanking: round.drawBalanceByRanking,
          avoidRepeat: round.drawAvoidRepeat,
          randomness: round.drawRandomness,
        }}
        configConfirmed={round.configConfirmed}
        duplasConfirmed={round.duplasConfirmed}
        grupos={grupos}
        mataMata={mataMata}
        gruposCompletos={await groupsComplete(roundId)}
        jogosCompletos={jogosCompletos}
        encerrada={round.status === "ENCERRADA"}
      />
    </AppShell>
  );
}
