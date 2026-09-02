// Chaveamento do mata-mata — portado fielmente do app anterior (planKnockout).
//
//   2 GRUPOS (ex.: 16 jog. = 2×4): classificam os 2 primeiros de cada grupo →
//     SEMIFINAL CRUZADA (1ºA×2ºB, 1ºB×2ºA) → Final + 3º.
//   D ≥ 6 (ex.: 18 = 3×3): 6 classificados; as 2 melhores no ranking geral vão
//     à semi (bye); a 3ª–6ª fazem as quartas (com anti-revanche); na semi, o
//     vencedor da quarta pega o bye que NÃO enfrentou nos grupos.
//   D = 4-5: semifinal direta (1×4, 2×3). D = 2-3: final direta.

import type { GroupStandings } from "./standings";

export type KnockoutFormat = "FINAL" | "SEMI" | "QUARTER_WITH_BYES";

export type Qualifier = {
  teamId: string;
  seedRank: number; // 1 = melhor no ranking global do dia
  groupName: string;
};

export type Pairing = { slot: number; teamAId: string; teamBId: string };

export type KnockoutPlan = {
  format: KnockoutFormat;
  qualifiers: Qualifier[];
  qualifierCount: number;
  /** Duplas que vão direto à semifinal (só em QUARTER_WITH_BYES). */
  byes: string[];
  /** Primeira fase criada: 'F' | 'SF' | 'QF'. */
  firstStage: "F" | "SF" | "QF";
  firstPairings: Pairing[];
  /** Aplicar anti-revanche de grupo ao montar a semifinal. */
  avoidSemiRematch?: boolean;
};

/**
 * Ranqueia TODAS as duplas globalmente por MÉDIAS por jogo — justo entre grupos
 * de tamanhos diferentes (ex.: grupo de 4 joga 3 partidas; de 3 joga 2).
 * Critérios: média de vitórias → média de saldo → média de games a favor.
 */
export function globalRank(
  groupStandings: readonly GroupStandings[],
): { teamId: string; groupName: string }[] {
  return groupStandings
    .flatMap((g) => g.standings.map((s) => ({ s, groupName: g.groupName })))
    .map(({ s, groupName }) => {
      const p = s.played || 1;
      return {
        teamId: s.teamId,
        groupName,
        avgW: s.wins / p,
        avgBal: s.gamesBalance / p,
        avgGf: (s.gamesFor ?? 0) / p,
      };
    })
    .sort((x, y) => y.avgW - x.avgW || y.avgBal - x.avgBal || y.avgGf - x.avgGf)
    .map((r) => ({ teamId: r.teamId, groupName: r.groupName }));
}

/**
 * Encaixa os byes (que vão direto à semi) com os vencedores das quartas.
 * Com anti-revanche, escolhe a atribuição que evita reencontro de grupo.
 */
export function buildSemifinalPairings(
  byes: [string, string],
  qfWinners: [string, string],
  sameGroup: (a: string, b: string) => boolean,
  avoidRematch: boolean,
): Pairing[] {
  const [b0, b1] = byes;
  const [w0, w1] = qfWinners;
  const optA: Pairing[] = [
    { slot: 0, teamAId: b0, teamBId: w0 },
    { slot: 1, teamAId: b1, teamBId: w1 },
  ];
  const optB: Pairing[] = [
    { slot: 0, teamAId: b0, teamBId: w1 },
    { slot: 1, teamAId: b1, teamBId: w0 },
  ];
  if (!avoidRematch) return optA;
  const rematches = (o: Pairing[]) =>
    o.filter((p) => sameGroup(p.teamAId, p.teamBId)).length;
  return rematches(optB) < rematches(optA) ? optB : optA;
}

/** Pareia os vencedores de uma fase (em ordem de slot) para a fase seguinte. */
export function nextStagePairings(winnersInSlotOrder: readonly string[]): Pairing[] {
  const pairings: Pairing[] = [];
  for (let i = 0; i < winnersInSlotOrder.length; i += 2) {
    const a = winnersInSlotOrder[i];
    const b = winnersInSlotOrder[i + 1];
    if (a && b) pairings.push({ slot: i / 2, teamAId: a, teamBId: b });
  }
  return pairings;
}

/** Monta o plano do mata-mata a partir das classificações de grupo. */
export function planKnockout(groupStandings: readonly GroupStandings[]): KnockoutPlan {
  const ranked = globalRank(groupStandings);
  const groupOf = new Map(ranked.map((r) => [r.teamId, r.groupName]));
  const met = (a: string, b: string) => !!a && !!b && groupOf.get(a) === groupOf.get(b);
  const mkQual = (ids: string[]): Qualifier[] =>
    ids.map((teamId, i) => ({
      teamId,
      seedRank: i + 1,
      groupName: groupOf.get(teamId) ?? "",
    }));
  const D = ranked.length;

  // 2 GRUPOS (ex.: 16 jog.): 2 primeiros de cada → semifinal cruzada.
  // Usa a ordem já classificada do grupo (V → Saldo → GP → confronto direto).
  if (groupStandings.length === 2 && D >= 4) {
    const at = (g: GroupStandings, pos: number) => g.standings[pos - 1]?.teamId;
    const [gA, gB] = groupStandings;
    const a1 = at(gA!, 1)!;
    const a2 = at(gA!, 2)!;
    const b1 = at(gB!, 1)!;
    const b2 = at(gB!, 2)!;
    return {
      format: "SEMI",
      qualifiers: mkQual([a1, b1, a2, b2]),
      qualifierCount: 4,
      byes: [],
      firstStage: "SF",
      firstPairings: [
        { slot: 0, teamAId: a1, teamBId: b2 }, // 1º A × 2º B
        { slot: 1, teamAId: b1, teamBId: a2 }, // 1º B × 2º A
      ],
    };
  }

  // D ≥ 6 (ex.: 18 jog. = 3×3): byes p/ os 2 melhores + quartas com anti-revanche.
  if (D >= 6) {
    const [s1, s2, s3, s4, s5, s6] = ranked.slice(0, 6).map((r) => r.teamId) as [
      string, string, string, string, string, string,
    ];
    const def: [string, string][] = [
      [s4, s5],
      [s3, s6],
    ];
    const alt: [string, string][] = [
      [s4, s6],
      [s3, s5],
    ];
    const rematches = (ps: [string, string][]) => ps.filter(([a, b]) => met(a, b)).length;
    const pairs = rematches(alt) < rematches(def) ? alt : def;
    const slot0 = pairs.find((p) => p.includes(s4))!;
    const slot1 = pairs.find((p) => p.includes(s3))!;
    return {
      format: "QUARTER_WITH_BYES",
      qualifiers: mkQual([s1, s2, s3, s4, s5, s6]),
      qualifierCount: 6,
      byes: [s1, s2],
      firstStage: "QF",
      firstPairings: [
        { slot: 0, teamAId: slot0[0], teamBId: slot0[1] },
        { slot: 1, teamAId: slot1[0], teamBId: slot1[1] },
      ],
      avoidSemiRematch: true,
    };
  }

  // D = 4-5: semifinal direta (1×4, 2×3).
  if (D >= 4) {
    const [q1, q2, q3, q4] = ranked.slice(0, 4).map((r) => r.teamId) as [
      string, string, string, string,
    ];
    return {
      format: "SEMI",
      qualifiers: mkQual([q1, q2, q3, q4]),
      qualifierCount: 4,
      byes: [],
      firstStage: "SF",
      firstPairings: [
        { slot: 0, teamAId: q1, teamBId: q4 },
        { slot: 1, teamAId: q2, teamBId: q3 },
      ],
    };
  }

  // D = 2-3: final direta.
  const top2 = ranked.slice(0, 2).map((r) => r.teamId);
  return {
    format: "FINAL",
    qualifiers: mkQual(top2),
    qualifierCount: top2.length,
    byes: [],
    firstStage: "F",
    firstPairings:
      top2.length === 2 ? [{ slot: 0, teamAId: top2[0]!, teamBId: top2[1]! }] : [],
  };
}
