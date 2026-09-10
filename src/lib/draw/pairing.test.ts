import { describe, it, expect } from "vitest";
import { drawPairs, pairKey } from "./pairing";
import { DrawError, type DrawConfig, type DrawPlayer, type PairHistory } from "./types";

const cfg = (over: Partial<DrawConfig> = {}): DrawConfig => ({
  balanceByRanking: true,
  avoidRepeat: true,
  randomness: 0,
  ...over,
});

const mk = (id: string, pontos: number): DrawPlayer => ({
  id,
  nome: id,
  pontos,
  convidado: false,
});

const mkNovo = (id: string): DrawPlayer => ({ id, nome: id, pontos: 0, convidado: false, novo: true });

const parceiroDe = (id: string, pairs: { player1Id: string; player2Id: string }[]) => {
  const p = pairs.find((x) => x.player1Id === id || x.player2Id === id);
  return p ? (p.player1Id === id ? p.player2Id : p.player1Id) : null;
};

const allIds = (pairs: { player1Id: string; player2Id: string }[]) =>
  pairs.flatMap((p) => [p.player1Id, p.player2Id]).sort();

describe("drawPairs — validações", () => {
  it("exige pelo menos 4 jogadores", () => {
    expect(() => drawPairs([mk("a", 0), mk("b", 0)], cfg(), new Map(), "s")).toThrow(
      DrawError,
    );
  });

  it("exige número par de jogadores", () => {
    const players = [mk("a", 0), mk("b", 0), mk("c", 0)];
    expect(() => drawPairs(players, cfg(), new Map(), "s")).toThrow(DrawError);
  });
});

describe("drawPairs — pareamento válido", () => {
  it("usa cada jogador exatamente uma vez", () => {
    const players = [mk("a", 90), mk("b", 70), mk("c", 50), mk("d", 30), mk("e", 10), mk("f", 0)];
    const res = drawPairs(players, cfg(), new Map(), "seed-1");
    expect(res.pairs).toHaveLength(3);
    expect(allIds(res.pairs)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("é determinístico para a mesma seed", () => {
    const players = [mk("a", 90), mk("b", 70), mk("c", 50), mk("d", 30)];
    const a = drawPairs(players, cfg({ randomness: 60 }), new Map(), "mesma-seed");
    const b = drawPairs(players, cfg({ randomness: 60 }), new Map(), "mesma-seed");
    expect(a.pairs).toEqual(b.pairs);
  });
});

describe("drawPairs — equilíbrio por ranking", () => {
  it("pareia o mais forte com o mais fraco (sem aleatoriedade)", () => {
    const players = [mk("top", 100), mk("hi", 80), mk("lo", 20), mk("bottom", 0)];
    const res = drawPairs(
      players,
      cfg({ randomness: 0, avoidRepeat: false }),
      new Map(),
      "s",
    );
    const has = (x: string, y: string) =>
      res.pairs.some(
        (p) =>
          (p.player1Id === x && p.player2Id === y) ||
          (p.player1Id === y && p.player2Id === x),
      );
    expect(has("top", "bottom")).toBe(true);
    expect(has("hi", "lo")).toBe(true);
  });
});

describe("drawPairs — jogador novo (sem ranking)", () => {
  // campo pequeno para o contraste do problema
  const campoPeq = () => [mk("a", 100), mk("b", 80), mk("c", 60), mk("d", 40), mk("e", 20)];
  // campo realista (15 pontuados: líder p0 ... lanterna p14) + 1 novato = 16
  const lider = "p0";
  const lanterna = "p14";
  const campoReal = () => Array.from({ length: 15 }, (_, i) => mk(`p${i}`, 150 - i * 10));

  it("SEM a flag novo, o 0 vira 'mais fraco' e gruda no 1º colocado (problema)", () => {
    const players = [...campoPeq(), mk("x", 0)];
    const res = drawPairs(players, cfg({ randomness: 0, avoidRepeat: false }), new Map(), "s");
    expect(parceiroDe("x", res.pairs)).toBe("a"); // exatamente o que NÃO queremos
  });

  it("COM a flag novo, NUNCA pareia com o líder nem com o lanterna (qualquer seed)", () => {
    for (let i = 0; i < 200; i++) {
      const players = [...campoReal(), mkNovo("x")];
      const res = drawPairs(players, cfg({ randomness: 0, avoidRepeat: false }), new Map(), `n${i}`);
      const parceiro = parceiroDe("x", res.pairs);
      expect(parceiro).not.toBe(lider);
      expect(parceiro).not.toBe(lanterna);
    }
  });

  it("o parceiro do novo varia entre vários jogadores (aleatório de verdade)", () => {
    const parceiros = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const players = [...campoReal(), mkNovo("x")];
      const res = drawPairs(players, cfg({ randomness: 40, avoidRepeat: false }), new Map(), `s${i}`);
      const p = parceiroDe("x", res.pairs);
      if (p) parceiros.add(p);
    }
    expect(parceiros.size).toBeGreaterThanOrEqual(3); // sorteio realmente aleatório
  });
});

describe("drawPairs — não-repetição de duplas", () => {
  it("evita uma dupla já formada quando é possível", () => {
    const players = [mk("a", 100), mk("b", 60), mk("c", 40), mk("d", 0)];
    // a & d já jogaram juntos (é justamente o par forte+fraco natural)
    const history: PairHistory = new Map([[pairKey("a", "d"), 1]]);
    const res = drawPairs(players, cfg({ randomness: 0 }), history, "s");
    const hasAD = res.pairs.some(
      (p) => pairKey(p.player1Id, p.player2Id) === pairKey("a", "d"),
    );
    expect(hasAD).toBe(false);
    expect(res.repeated).toHaveLength(0);
  });

  it("avisa o admin quando a repetição é inevitável", () => {
    const players = [mk("a", 100), mk("b", 60), mk("c", 40), mk("d", 0)];
    // Todos os pares com "a" já jogaram → qualquer emparelhamento repete um deles.
    const history: PairHistory = new Map([
      [pairKey("a", "b"), 1],
      [pairKey("a", "c"), 1],
      [pairKey("a", "d"), 1],
    ]);
    const res = drawPairs(players, cfg({ randomness: 0 }), history, "s");
    expect(res.repeated.length).toBeGreaterThanOrEqual(1);
    // ainda assim sorteou (não travou)
    expect(res.pairs).toHaveLength(2);
  });
});
