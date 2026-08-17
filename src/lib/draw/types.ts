// Tipos do motor de sorteio (módulo puro, sem dependência de banco).

export type DrawPlayer = {
  id: string;
  nome: string;
  /** Pontuação acumulada no campeonato — base do equilíbrio (forte + fraco). */
  pontos: number;
  /** Convidado joga o sorteio, mas não pontua no ranking. */
  convidado: boolean;
};

export type DrawConfig = {
  /** Parear melhor colocado com menos colocado (equilíbrio por ranking). */
  balanceByRanking: boolean;
  /** Minimizar repetição de duplas já formadas no campeonato. */
  avoidRepeat: boolean;
  /** 0..100 — quanto embaralha a ordem antes de parear. */
  randomness: number;
};

export type DrawPair = { player1Id: string; player2Id: string };

/** pairKey ("a|b" ordenado) -> nº de vezes que já jogaram juntos no campeonato. */
export type PairHistory = Map<string, number>;

/** Dupla que repetiu (para avisar o admin). */
export type RepeatedPair = { pair: DrawPair; timesBefore: number };

export type DrawResult = {
  pairs: DrawPair[];
  /** Duplas do resultado que já haviam jogado juntas antes (aviso ao admin). */
  repeated: RepeatedPair[];
  seed: string;
};

export class DrawError extends Error {
  constructor(
    public code: "MIN_PLAYERS" | "ODD_PLAYERS",
    message: string,
  ) {
    super(message);
    this.name = "DrawError";
  }
}
