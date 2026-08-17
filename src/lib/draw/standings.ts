// Fase de grupos: geração dos confrontos (todos contra todos) e classificação
// por vitórias e saldo de games. Portado do comportamento do app anterior.

export type GroupMatch = {
  teamAId: string;
  teamBId: string;
  scoreA: number | null;
  scoreB: number | null;
};

export type TeamStanding = { teamId: string; wins: number; gamesBalance: number };
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

/** Classificação de um grupo: vitórias (desc) e, no empate, saldo de games (desc). */
export function computeGroupStandings(
  groupName: string,
  teamIds: readonly string[],
  matches: readonly GroupMatch[],
): GroupStandings {
  const table = new Map<string, TeamStanding>(
    teamIds.map((id) => [id, { teamId: id, wins: 0, gamesBalance: 0 }]),
  );

  for (const m of matches) {
    if (m.scoreA == null || m.scoreB == null) continue;
    const a = table.get(m.teamAId);
    const b = table.get(m.teamBId);
    if (!a || !b) continue;
    a.gamesBalance += m.scoreA - m.scoreB;
    b.gamesBalance += m.scoreB - m.scoreA;
    if (m.scoreA > m.scoreB) a.wins += 1;
    else if (m.scoreB > m.scoreA) b.wins += 1;
  }

  const standings = [...table.values()].sort(
    (x, y) => y.wins - x.wins || y.gamesBalance - x.gamesBalance,
  );
  return { groupName, standings };
}
