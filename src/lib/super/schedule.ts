// Motor do Torneio Super (Americano individual).
// Gera o rodízio em que CADA atleta joga de dupla com todos os outros
// exatamente uma vez (1-fatorização de K_N pelo método do rodízio / "whist").
// N-1 rodadas, N/2 duplas por rodada agrupadas em N/4 jogos (2 duplas por jogo).

export type SuperGame = { a1: number; a2: number; b1: number; b2: number };
export type SuperRound = { rodada: number; games: SuperGame[] };

export const SUPER_SIZES = [8, 12, 16] as const;
export type SuperSize = (typeof SUPER_SIZES)[number];

/** Rodízio para N atletas (N múltiplo de 4). Assentos 0..N-1. */
export function buildSuperSchedule(n: number): SuperRound[] {
  if (n < 4 || n % 4 !== 0) {
    throw new Error("O Super suporta apenas 8, 12 ou 16 atletas.");
  }
  const fixed = 0;
  const rest = Array.from({ length: n - 1 }, (_, i) => i + 1); // 1..n-1
  const rounds: SuperRound[] = [];

  for (let r = 0; r < n - 1; r++) {
    // rotaciona os não-fixos (método do rodízio) e pareia posições simétricas
    const rotated = rest.map((_, i) => rest[(i + r) % (n - 1)]);
    const arrangement = [fixed, ...rotated];
    const pairs: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) {
      pairs.push([arrangement[i], arrangement[n - 1 - i]]);
    }
    // agrupa duplas consecutivas em jogos (2 duplas por jogo)
    const games: SuperGame[] = [];
    for (let i = 0; i < pairs.length; i += 2) {
      const [a1, a2] = pairs[i];
      const [b1, b2] = pairs[i + 1];
      games.push({ a1, a2, b1, b2 });
    }
    rounds.push({ rodada: r + 1, games });
  }
  return rounds;
}
