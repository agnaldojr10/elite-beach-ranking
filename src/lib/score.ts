/**
 * Interpreta o placar digitado. Aceita separadores (6-2, 6/2, 6x2, 6 2) e
 * dois dígitos colados (62 → 6-2), para lançamento rápido. Retorna [a, b] ou
 * null se não conseguir ler. Usado no ranking e no torneio (mesma máscara).
 */
export function parseScorePair(raw: string): [number, number] | null {
  const s = raw.trim();
  if (!s) return null;
  const sep = s.match(/^(\d+)\s*[-/x:.\s]\s*(\d+)$/i);
  if (sep) return [parseInt(sep[1], 10), parseInt(sep[2], 10)];
  const digits = s.replace(/\D/g, "");
  if (digits.length === 2) return [parseInt(digits[0], 10), parseInt(digits[1], 10)];
  return null;
}

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
