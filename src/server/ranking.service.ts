import { prisma } from "@/lib/prisma";

export type RankingRow = {
  posicao: number;
  playerId: string;
  nome: string;
  pontos: number;
  variacao: "up" | "down" | "same";
};

export type PneuInfo = { playerId: string; nome: string; vezes: number } | null;

export type RankingGeral = { rows: RankingRow[]; pneu: PneuInfo };

function rankPositions(totals: Map<string, number>): Map<string, number> {
  const ordered = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const pos = new Map<string, number>();
  ordered.forEach(([playerId], i) => pos.set(playerId, i + 1));
  return pos;
}

/**
 * Ranking geral do campeonato: soma dos RoundResult por jogador (só REGULAR),
 * com variação ↑/↓ em relação à posição antes da última rodada encerrada, e o
 * troféu pneu (jogador com mais 6x0 sofridos no campeonato).
 */
export async function getRankingGeral(championshipId: string): Promise<RankingGeral> {
  const results = await prisma.roundResult.findMany({
    where: { round: { championshipId } },
    select: {
      playerId: true,
      pointsAwarded: true,
      round: { select: { numero: true } },
      player: { select: { nome: true, type: true, active: true } },
    },
  });

  const regulars = results.filter((r) => r.player.type === "REGULAR" && r.player.active);
  const nomeById = new Map(regulars.map((r) => [r.playerId, r.player.nome]));

  // Total atual por jogador.
  const totals = new Map<string, number>();
  for (const r of regulars) {
    totals.set(r.playerId, (totals.get(r.playerId) ?? 0) + r.pointsAwarded);
  }

  // Última rodada com resultado (por número) → base para a variação.
  const lastNumero = regulars.reduce<number | null>((max, r) => {
    const n = r.round.numero ?? null;
    return n != null && (max == null || n > max) ? n : max;
  }, null);

  const prevTotals = new Map<string, number>();
  for (const r of regulars) {
    if (lastNumero != null && r.round.numero === lastNumero) continue;
    prevTotals.set(r.playerId, (prevTotals.get(r.playerId) ?? 0) + r.pointsAwarded);
  }

  const currPos = rankPositions(totals);
  const prevPos = rankPositions(prevTotals);

  const rows: RankingRow[] = [...totals.entries()]
    .map(([playerId, pontos]) => {
      const cur = currPos.get(playerId)!;
      const prev = prevPos.get(playerId);
      let variacao: RankingRow["variacao"] = "same";
      if (prev != null) variacao = cur < prev ? "up" : cur > prev ? "down" : "same";
      return { posicao: cur, playerId, nome: nomeById.get(playerId) ?? "", pontos, variacao };
    })
    .sort((a, b) => a.posicao - b.posicao);

  const pneu = await getPneu(championshipId);
  return { rows, pneu };
}

/** Jogador com mais placares de 6x0 sofridos no campeonato (troféu pneu). */
export async function getPneu(championshipId: string): Promise<PneuInfo> {
  const matches = await prisma.match.findMany({
    where: {
      round: { championshipId },
      OR: [
        { scoreA: 6, scoreB: 0 },
        { scoreA: 0, scoreB: 6 },
      ],
    },
    select: { teamAId: true, teamBId: true, scoreA: true, scoreB: true },
  });
  if (matches.length === 0) return null;

  const teamIds = [...new Set(matches.flatMap((m) => [m.teamAId, m.teamBId]))];
  const teams = await prisma.team.findMany({
    where: { id: { in: teamIds } },
    include: {
      player1: { select: { id: true, nome: true, type: true } },
      player2: { select: { id: true, nome: true, type: true } },
    },
  });
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const count = new Map<string, number>();
  const nome = new Map<string, string>();
  for (const m of matches) {
    const loserId = m.scoreA === 6 ? m.teamBId : m.teamAId;
    const team = teamById.get(loserId);
    if (!team) continue;
    for (const pl of [team.player1, team.player2]) {
      if (pl.type !== "REGULAR") continue;
      count.set(pl.id, (count.get(pl.id) ?? 0) + 1);
      nome.set(pl.id, pl.nome);
    }
  }
  if (count.size === 0) return null;

  const [playerId, vezes] = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
  return { playerId, nome: nome.get(playerId) ?? "", vezes };
}
