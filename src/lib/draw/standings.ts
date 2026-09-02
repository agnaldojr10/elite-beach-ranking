// Fase de grupos: geração dos confrontos (todos contra todos) e classificação.
// Critérios de desempate: Vitórias → Saldo de games → Games a favor →
// Confronto direto (entre as duplas ainda empatadas). Portado/ampliado do app
// anterior. `played` permite a classificação por MÉDIAS entre grupos desiguais.

export type GroupMatch = {
  teamAId: string;
  teamBId: string;
  scoreA: number | null;
  scoreB: number | null;
};

export type TeamStanding = {
  teamId: string;
  wins: number;
  gamesBalance: number;
  gamesFor: number;
  played: number;
};
export type GroupStandings = { groupName: string; standings: TeamStanding[] };

/** Confrontos round-robin (todos contra todos) de um grupo. */
export function roundRobinPairings(
  teamIds: readonly string[],
): { teamAId: string; teamBId: string }[] {
  const pairings: { teamAId: string; teamBId: string }[] = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      pairings.push({ teamAId: teamIds[i], teamBId: teamIds[j] });
    }
  }
  return pairings;
}

/** Ordem por confronto direto entre um conjunto de duplas empatadas. */
function headToHeadOrder(ids: readonly string[], matches: readonly GroupMatch[]): string[] {
  const mini = new Map(ids.map((id) => [id, { id, wins: 0, bal: 0, gf: 0 }]));
  for (const m of matches) {
    if (m.scoreA == null || m.scoreB == null) continue;
    const a = mini.get(m.teamAId);
    const b = mini.get(m.teamBId);
    if (!a || !b) continue; // só confrontos ENTRE os empatados
    a.gf += m.scoreA;
    a.bal += m.scoreA - m.scoreB;
    b.gf += m.scoreB;
    b.bal += m.scoreB - m.scoreA;
    if (m.scoreA > m.scoreB) a.wins += 1;
    else if (m.scoreB > m.scoreA) b.wins += 1;
  }
  return [...mini.values()]
    .sort((x, y) => y.wins - x.wins || y.bal - x.bal || y.gf - x.gf)
    .map((v) => v.id);
}

/** Aplica o confronto direto nos blocos ainda empatados em V/Saldo/GP. */
function applyHeadToHead(
  sorted: readonly TeamStanding[],
  matches: readonly GroupMatch[],
): TeamStanding[] {
  const same = (a: TeamStanding, b: TeamStanding) =>
    a.wins === b.wins && a.gamesBalance === b.gamesBalance && a.gamesFor === b.gamesFor;
  const out: TeamStanding[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && same(sorted[i], sorted[j])) j++;
    const run = sorted.slice(i, j);
    if (run.length > 1) {
      const order = headToHeadOrder(run.map((r) => r.teamId), matches);
      const byId = new Map(run.map((r) => [r.teamId, r]));
      for (const id of order) out.push(byId.get(id)!);
    } else {
      out.push(run[0]);
    }
    i = j;
  }
  return out;
}

/**
 * Classificação de um grupo:
 * Vitórias → Saldo de games → Games a favor → Confronto direto.
 */
export function computeGroupStandings(
  groupName: string,
  teamIds: readonly string[],
  matches: readonly GroupMatch[],
): GroupStandings {
  const table = new Map<string, TeamStanding>(
    teamIds.map((id) => [id, { teamId: id, wins: 0, gamesBalance: 0, gamesFor: 0, played: 0 }]),
  );

  for (const m of matches) {
    if (m.scoreA == null || m.scoreB == null) continue;
    const a = table.get(m.teamAId);
    const b = table.get(m.teamBId);
    if (!a || !b) continue;
    a.gamesFor += m.scoreA;
    a.gamesBalance += m.scoreA - m.scoreB;
    a.played += 1;
    b.gamesFor += m.scoreB;
    b.gamesBalance += m.scoreB - m.scoreA;
    b.played += 1;
    if (m.scoreA > m.scoreB) a.wins += 1;
    else if (m.scoreB > m.scoreA) b.wins += 1;
  }

  const base = [...table.values()].sort(
    (x, y) => y.wins - x.wins || y.gamesBalance - x.gamesBalance || y.gamesFor - x.gamesFor,
  );
  return { groupName, standings: applyHeadToHead(base, matches) };
}
