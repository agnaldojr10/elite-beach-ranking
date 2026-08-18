/**
 * Regra de placar do beach tennis (set único):
 * - vence quem chega a 6 games com 2 de vantagem → 6×0..6×4;
 * - em 5×5 é preciso abrir 2 games → 7×5 (6×5 NÃO vale);
 * - em 6×6 joga-se o tiebreak e o vencedor é declarado 7×6.
 * Portanto, placares válidos: 6×{0..4}, 7×5, 7×6 (e os inversos). Sem empates.
 */
export function isValidBeachScore(a: number, b: number): boolean {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return false;
  if (a === b) return false;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi === 6 && lo <= 4) return true;
  if (hi === 7 && (lo === 5 || lo === 6)) return true;
  return false;
}
