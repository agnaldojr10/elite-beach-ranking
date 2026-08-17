import { prisma } from "@/lib/prisma";
import { computeGroupStandings, type GroupStandings } from "@/lib/draw/standings";
import { buildSemifinalPairings, planKnockout } from "@/lib/draw/bracket";

type MatchRow = {
  id: string;
  phase: "GRUPOS" | "QUARTAS" | "SEMIFINAL" | "FINAL" | "TERCEIRO";
  slot: number | null;
  teamAId: string;
  teamBId: string;
  scoreA: number | null;
  scoreB: number | null;
};

function isResolved(m: { scoreA: number | null; scoreB: number | null }): boolean {
  return m.scoreA != null && m.scoreB != null && m.scoreA !== m.scoreB;
}
function winnerOf(m: MatchRow): string {
  return (m.scoreA as number) > (m.scoreB as number) ? m.teamAId : m.teamBId;
}
function loserOf(m: MatchRow): string {
  return (m.scoreA as number) > (m.scoreB as number) ? m.teamBId : m.teamAId;
}

/** Classificação de todos os grupos da rodada, a partir dos placares. */
export async function buildGroupStandings(roundId: string): Promise<GroupStandings[]> {
  const teams = await prisma.team.findMany({
    where: { roundId },
    select: { id: true, grupo: true },
  });
  const matches = await prisma.match.findMany({
    where: { roundId, phase: "GRUPOS" },
    select: { grupo: true, teamAId: true, teamBId: true, scoreA: true, scoreB: true },
  });

  const byGroup = new Map<string, { ids: string[]; matches: typeof matches }>();
  for (const t of teams) {
    const k = t.grupo ?? "A";
    if (!byGroup.has(k)) byGroup.set(k, { ids: [], matches: [] });
    byGroup.get(k)!.ids.push(t.id);
  }
  for (const m of matches) {
    byGroup.get(m.grupo ?? "A")?.matches.push(m);
  }

  return [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, { ids, matches: ms }]) => computeGroupStandings(label, ids, ms));
}

/** Verdadeiro quando todos os jogos da fase de grupos têm placar. */
export async function groupsComplete(roundId: string): Promise<boolean> {
  const total = await prisma.match.count({ where: { roundId, phase: "GRUPOS" } });
  if (total === 0) return false;
  const pendentes = await prisma.match.count({
    where: { roundId, phase: "GRUPOS", OR: [{ scoreA: null }, { scoreB: null }] },
  });
  return pendentes === 0;
}

async function phaseMatches(roundId: string, phase: MatchRow["phase"]): Promise<MatchRow[]> {
  const rows = await prisma.match.findMany({
    where: { roundId, phase },
    select: { id: true, phase: true, slot: true, teamAId: true, teamBId: true, scoreA: true, scoreB: true },
    orderBy: { slot: "asc" },
  });
  return rows as MatchRow[];
}

/** Cria o confronto se ainda não existir; atualiza os times se ainda sem placar. */
async function ensureMatch(
  roundId: string,
  phase: MatchRow["phase"],
  slot: number,
  teamAId: string,
  teamBId: string,
): Promise<void> {
  const existing = await prisma.match.findFirst({ where: { roundId, phase, slot } });
  if (existing) {
    if (
      existing.scoreA == null &&
      existing.scoreB == null &&
      (existing.teamAId !== teamAId || existing.teamBId !== teamBId)
    ) {
      await prisma.match.update({ where: { id: existing.id }, data: { teamAId, teamBId } });
    }
    return;
  }
  await prisma.match.create({
    data: { roundId, phase, slot, teamAId, teamBId, status: "PENDENTE" },
  });
}

/**
 * Monta/avança o mata-mata a partir da fase de grupos concluída.
 * Idempotente: pode ser chamado após cada placar — cria a próxima fase quando
 * a anterior estiver completa (quartas → semi → final + 3º).
 */
export async function syncKnockout(roundId: string): Promise<MatchRow[]> {
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round) throw new Error("Rodada não encontrada.");
  if (round.isFinals) throw new Error("A FINALS é sorteada no papel — não pelo sistema.");
  if (!(await groupsComplete(roundId))) {
    throw new Error("Finalize a fase de grupos antes de gerar o mata-mata.");
  }

  const standings = await buildGroupStandings(roundId);
  const plan = planKnockout(standings);

  const teams = await prisma.team.findMany({ where: { roundId }, select: { id: true, grupo: true } });
  const groupOf = new Map(teams.map((t) => [t.id, t.grupo ?? ""]));
  const sameGroup = (a: string, b: string) => !!a && !!b && groupOf.get(a) === groupOf.get(b);

  // 1) primeira fase (QF, SF ou F direto)
  const firstPhase: MatchRow["phase"] =
    plan.firstStage === "QF" ? "QUARTAS" : plan.firstStage === "SF" ? "SEMIFINAL" : "FINAL";
  for (const p of plan.firstPairings) {
    await ensureMatch(roundId, firstPhase, p.slot, p.teamAId, p.teamBId);
  }

  // 2) quartas concluídas → semifinal (com byes + anti-revanche)
  if (plan.format === "QUARTER_WITH_BYES") {
    const qfs = await phaseMatches(roundId, "QUARTAS");
    if (qfs.length === 2 && qfs.every(isResolved)) {
      const w0 = winnerOf(qfs[0]);
      const w1 = winnerOf(qfs[1]);
      const sf = buildSemifinalPairings(
        [plan.byes[0], plan.byes[1]] as [string, string],
        [w0, w1],
        sameGroup,
        !!plan.avoidSemiRematch,
      );
      for (const p of sf) await ensureMatch(roundId, "SEMIFINAL", p.slot, p.teamAId, p.teamBId);
    }
  }

  // 3) semifinais concluídas → final + disputa de 3º
  const sfs = await phaseMatches(roundId, "SEMIFINAL");
  if (sfs.length === 2 && sfs.every(isResolved)) {
    await ensureMatch(roundId, "FINAL", 0, winnerOf(sfs[0]), winnerOf(sfs[1]));
    await ensureMatch(roundId, "TERCEIRO", 0, loserOf(sfs[0]), loserOf(sfs[1]));
  }

  return phaseMatches(roundId, "QUARTAS").then(async (qf) => [
    ...qf,
    ...(await phaseMatches(roundId, "SEMIFINAL")),
    ...(await phaseMatches(roundId, "FINAL")),
    ...(await phaseMatches(roundId, "TERCEIRO")),
  ]);
}
