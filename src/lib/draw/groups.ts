import { DrawError, type Group, type SeededTeam } from "./types";

const LABELS = "ABCDEFGH";

/**
 * Distribui as duplas no NÚMERO DE GRUPOS informado, equilibrando a força.
 * A distribuição é em "serpentina" (A,B,C,C,B,A,…) por força, para os grupos
 * ficarem parelhos; os tamanhos ficam iguais ou diferem em 1.
 *
 * Ex.: 8 duplas em 2 grupos → 2 grupos de 4. 10 duplas em 3 grupos → 4,3,3.
 */
export function formGroups(teams: readonly SeededTeam[], numGroups: number): Group[] {
  if (numGroups < 1) {
    throw new DrawError("GROUP_SIZE", "É preciso pelo menos 1 grupo.");
  }
  if (numGroups > teams.length) {
    throw new DrawError("GROUP_SIZE", "Há mais grupos do que duplas presentes.");
  }

  const nGroups = numGroups;
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
