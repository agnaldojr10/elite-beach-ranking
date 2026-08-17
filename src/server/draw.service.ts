import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { drawPairs, pairKey } from "@/lib/draw/pairing";
import { formGroups } from "@/lib/draw/groups";
import { roundRobinPairings } from "@/lib/draw/standings";
import type { DrawConfig, DrawPlayer, PairHistory } from "@/lib/draw/types";

/**
 * Pontuação acumulada de cada jogador no campeonato (rodadas já encerradas,
 * exceto a atual). É a "força" usada no equilíbrio do sorteio.
 */
async function pontosNoCampeonato(
  championshipId: string,
  exceptRoundId: string,
): Promise<Map<string, number>> {
  const rows = await prisma.roundResult.findMany({
    where: { round: { championshipId }, roundId: { not: exceptRoundId } },
    select: { playerId: true, pointsAwarded: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.playerId, (map.get(r.playerId) ?? 0) + r.pointsAwarded);
  return map;
}

/** Histórico de duplas já formadas no campeonato (para a não-repetição). */
async function historicoDeDuplas(
  championshipId: string,
  exceptRoundId: string,
): Promise<PairHistory> {
  const teams = await prisma.team.findMany({
    where: { round: { championshipId }, roundId: { not: exceptRoundId } },
    select: { player1Id: true, player2Id: true },
  });
  const history: PairHistory = new Map();
  for (const t of teams) {
    const k = pairKey(t.player1Id, t.player2Id);
    history.set(k, (history.get(k) ?? 0) + 1);
  }
  return history;
}

/** Presentes da rodada como entrada do motor (com pontos e flag de convidado). */
async function jogadoresPresentes(
  roundId: string,
  pontos: Map<string, number>,
): Promise<DrawPlayer[]> {
  const attendances = await prisma.attendance.findMany({
    where: { roundId },
    include: { player: true },
  });
  return attendances.map((a) => ({
    id: a.playerId,
    nome: a.player.nome,
    pontos: pontos.get(a.playerId) ?? 0,
    convidado: a.player.type === "GUEST",
  }));
}

export type GenerateDrawResult = {
  seed: string;
  groups: { label: string; teams: { id: string; player1Id: string; player2Id: string }[] }[];
  /** Duplas repetidas (aviso ao admin), com nomes. */
  repeated: { player1: string; player2: string; timesBefore: number }[];
};

/**
 * Sorteia e persiste as duplas + grupos + jogos da fase de grupos de uma rodada.
 * Idempotente: refazer apaga o sorteio anterior (só antes de encerrar).
 */
export async function generateDraw(
  roundId: string,
  seedArg?: string,
): Promise<GenerateDrawResult> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { championship: { select: { id: true } } },
  });
  if (!round) throw new Error("Rodada não encontrada.");
  if (round.isFinals) throw new Error("A FINALS é sorteada no papel — não pelo sistema.");
  if (round.status === "ENCERRADA") throw new Error("Rodada encerrada não pode ser re-sorteada.");

  const championshipId = round.championship.id;
  const pontos = await pontosNoCampeonato(championshipId, roundId);
  const players = await jogadoresPresentes(roundId, pontos);
  const history = await historicoDeDuplas(championshipId, roundId);

  const config: DrawConfig = {
    balanceByRanking: round.drawBalanceByRanking,
    avoidRepeat: round.drawAvoidRepeat,
    randomness: round.drawRandomness,
  };

  const seed = seedArg ?? randomUUID();
  const draw = drawPairs(players, config, history, seed);

  // Força de cada dupla (índice → força) para equilibrar os grupos.
  const seededTeams = draw.pairs.map((p, i) => ({
    id: String(i),
    strength: (pontos.get(p.player1Id) ?? 0) + (pontos.get(p.player2Id) ?? 0),
  }));
  const groups = formGroups(seededTeams, round.drawGroupSize);
  const grupoByIndex = new Map<number, string>();
  for (const g of groups) for (const t of g.teams) grupoByIndex.set(Number(t.id), g.label);

  const nomeById = new Map(players.map((p) => [p.id, p.nome]));

  const createdTeams = await prisma.$transaction(
    async (tx) => {
      await tx.match.deleteMany({ where: { roundId } });
      await tx.team.deleteMany({ where: { roundId } });

      const teams = await tx.team.createManyAndReturn({
        data: draw.pairs.map((p, i) => ({
          roundId,
          player1Id: p.player1Id,
          player2Id: p.player2Id,
          grupo: grupoByIndex.get(i) ?? null,
        })),
        select: { id: true, player1Id: true, player2Id: true, grupo: true },
      });

      // Jogos round-robin dentro de cada grupo.
      const byGroup = new Map<string, string[]>();
      for (const t of teams) {
        const key = t.grupo ?? "A";
        if (!byGroup.has(key)) byGroup.set(key, []);
        byGroup.get(key)!.push(t.id);
      }
      const matchesData = [...byGroup.entries()].flatMap(([grupo, ids]) =>
        roundRobinPairings(ids).map((pp) => ({
          roundId,
          phase: "GRUPOS" as const,
          grupo,
          teamAId: pp.teamAId,
          teamBId: pp.teamBId,
        })),
      );
      await tx.match.createMany({ data: matchesData });

      await tx.round.update({
        where: { id: roundId },
        data: { status: "SORTEADA", duplasConfirmed: false },
      });

      return teams;
    },
    { timeout: 20000, maxWait: 10000 },
  );

  return {
    seed,
    groups: groups.map((g) => ({
      label: g.label,
      teams: createdTeams
        .filter((t) => (t.grupo ?? "A") === g.label)
        .map((t) => ({ id: t.id, player1Id: t.player1Id, player2Id: t.player2Id })),
    })),
    repeated: draw.repeated.map((r) => ({
      player1: nomeById.get(r.pair.player1Id) ?? r.pair.player1Id,
      player2: nomeById.get(r.pair.player2Id) ?? r.pair.player2Id,
      timesBefore: r.timesBefore,
    })),
  };
}
