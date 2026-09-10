import { mulberry32, seedFromString } from "./rng";
import {
  DrawError,
  type DrawConfig,
  type DrawPair,
  type DrawPlayer,
  type DrawResult,
  type PairHistory,
  type RepeatedPair,
} from "./types";

/** Chave de par não-ordenada, para o histórico de duplas do campeonato. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function shuffle<T>(arr: readonly T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Força efetiva de cada jogador para o sorteio. Jogadores SEM ranking (novos)
 * não valem "0" (o que os grudaria no 1º colocado no equilíbrio). Recebem uma
 * força provisória ALEATÓRIA por sorteio, dentro da FAIXA CENTRAL do ranking
 * (miolo 50%): o parceiro do novato varia a cada sorteio (aleatório de verdade)
 * e ele nunca cai preso no extremo — logo, nunca gruda no 1º nem no último.
 */
function effectiveStrength(
  players: readonly DrawPlayer[],
  rnd: () => number,
): Map<string, number> {
  const comRanking = players.filter((p) => !p.novo).map((p) => p.pontos);
  const map = new Map<string, number>();
  if (comRanking.length === 0) {
    // Todos novos (ex.: 1ª rodada): ordem totalmente aleatória.
    for (const p of players) map.set(p.id, rnd());
    return map;
  }
  const min = Math.min(...comRanking);
  const spread = Math.max(...comRanking) - min || 1;
  for (const p of players) {
    // miolo entre 20% e 80% da faixa de pontos → nunca no topo/fundo
    map.set(p.id, p.novo ? min + spread * (0.2 + rnd() * 0.6) : p.pontos);
  }
  return map;
}

/** Ordena por força efetiva (desc) com um ruído proporcional à aleatoriedade. */
function orderByRanking(
  players: readonly DrawPlayer[],
  randomness: number,
  rnd: () => number,
  strength: Map<string, number>,
): DrawPlayer[] {
  const vals = [...strength.values()];
  const spread = Math.max(...vals) - Math.min(...vals) || 1;
  const amp = (randomness / 100) * spread;
  return [...players]
    .map((p) => ({ p, key: (strength.get(p.id) ?? 0) + (rnd() * 2 - 1) * amp }))
    .sort((x, y) => y.key - x.key)
    .map((x) => x.p);
}

/** Forma duplas a partir de uma ordem: forte+fraco (equilíbrio) ou sequencial. */
function pairFromOrder(order: readonly DrawPlayer[], balance: boolean): DrawPair[] {
  const n = order.length;
  const pairs: DrawPair[] = [];
  if (balance) {
    for (let i = 0; i < n / 2; i++) {
      pairs.push({ player1Id: order[i].id, player2Id: order[n - 1 - i].id });
    }
  } else {
    for (let i = 0; i < n / 2; i++) {
      pairs.push({ player1Id: order[i * 2].id, player2Id: order[i * 2 + 1].id });
    }
  }
  return pairs;
}

function score(
  pairs: readonly DrawPair[],
  history: PairHistory,
  strength: Map<string, number>,
): { repeatScore: number; imbalance: number } {
  let repeatScore = 0;
  const sums: number[] = [];
  for (const p of pairs) {
    repeatScore += history.get(pairKey(p.player1Id, p.player2Id)) ?? 0;
    sums.push((strength.get(p.player1Id) ?? 0) + (strength.get(p.player2Id) ?? 0));
  }
  const imbalance = sums.length ? Math.max(...sums) - Math.min(...sums) : 0;
  return { repeatScore, imbalance };
}

/**
 * Sorteia as duplas.
 * - Equilíbrio por ranking: pareia forte com fraco (com aleatoriedade opcional).
 * - Não-repetição: minimiza duplas já formadas no campeonato; se sobrar
 *   repetição inevitável, ela vem em `repeated` para avisar o admin.
 * Determinístico por `seed` (mesma seed → mesmo sorteio; permite "refazer").
 */
export function drawPairs(
  players: readonly DrawPlayer[],
  config: DrawConfig,
  history: PairHistory,
  seed: string,
): DrawResult {
  if (players.length < 4) {
    throw new DrawError("MIN_PLAYERS", "É preciso pelo menos 4 jogadores presentes.");
  }
  if (players.length % 2 !== 0) {
    throw new DrawError("ODD_PLAYERS", "O número de jogadores presentes precisa ser par.");
  }

  const rnd = mulberry32(seedFromString(seed));
  // Força efetiva: novos entram no miolo aleatório do ranking, não como "0".
  const strength = effectiveStrength(players, rnd);

  // Para não repetir, precisamos explorar alternativas — então garantimos uma
  // aleatoriedade mínima de busca quando avoidRepeat está ligado.
  const searchRandomness = config.avoidRepeat
    ? Math.max(config.randomness, 30)
    : config.randomness;

  const deterministic =
    config.balanceByRanking && searchRandomness === 0 && !config.avoidRepeat;
  const attempts = deterministic ? 1 : 500;

  let best:
    | { pairs: DrawPair[]; repeatScore: number; imbalance: number }
    | null = null;

  for (let i = 0; i < attempts; i++) {
    const order = config.balanceByRanking
      ? orderByRanking(players, searchRandomness, rnd, strength)
      : shuffle(players, rnd);
    const pairs = pairFromOrder(order, config.balanceByRanking);
    const { repeatScore, imbalance } = score(pairs, history, strength);

    const better =
      !best ||
      (config.avoidRepeat && repeatScore < best.repeatScore) ||
      ((!config.avoidRepeat || repeatScore === best.repeatScore) &&
        config.balanceByRanking &&
        imbalance < best.imbalance);

    if (better) best = { pairs, repeatScore, imbalance };
    // Ótimo perfeito: nenhuma repetição e (se não equilibra) nada a melhorar.
    if (best && best.repeatScore === 0 && !config.balanceByRanking) break;
  }

  const chosen = best!;
  const repeated: RepeatedPair[] = chosen.pairs
    .map((pair) => ({
      pair,
      timesBefore: history.get(pairKey(pair.player1Id, pair.player2Id)) ?? 0,
    }))
    .filter((r) => r.timesBefore > 0);

  return { pairs: chosen.pairs, repeated, seed };
}
