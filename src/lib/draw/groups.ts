import { DrawError, type Group, type SeededTeam } from "./types";

const LABELS = "ABCDEFGH";

/**
 * Distribui as duplas em grupos do tamanho pedido, equilibrando a força.
 * O nº de grupos = arredondamento de (duplas / tamanho); a distribuição é em
 * "serpentina" (A,B,C,C,B,A,…) por força, para os grupos ficarem parelhos.
 *
 * Ex.: 8 duplas, tamanho 4 → 2 grupos de 4. 9 duplas, tamanho 3 → 3 grupos de 3.
 */
export function formGroups(teams: readonly SeededTeam[], groupSize: number): Group[] {
  if (groupSize < 2) {
    throw new DrawError("GROUP_SIZE", "O tamanho do grupo deve ser pelo menos 2 duplas.");
  }
  if (teams.length < groupSize) {
    throw new DrawError("GROUP_SIZE", "Há menos duplas do que o tamanho de um grupo.");
  }

  const nGroups = Math.max(1, Math.round(teams.length / groupSize));
  const sorted = [...teams].sort((a, b) => b.strength - a.strength);
  const buckets: SeededTeam[][] = Array.from({ length: nGroups }, () => []);

  // Serpentina: desce 0→n-1, sobe n-1→0, e repete.
  let idx = 0;
  let dir = 1;
  for (const t of sorted) {
    buckets[idx].push(t);
    idx += dir;
    if (idx >= nGroups) {
      idx = nGroups - 1;
      dir = -1;
    } else if (idx < 0) {
      idx = 0;
      dir = 1;
    }
  }

  return buckets.map((groupTeams, i) => ({
    label: LABELS[i] ?? String(i + 1),
    teams: groupTeams,
  }));
}
