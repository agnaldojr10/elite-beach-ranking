import { describe, it, expect } from "vitest";
import { computeGroupStandings, roundRobinPairings, type GroupMatch } from "./standings";

describe("roundRobinPairings", () => {
  it("gera todos contra todos", () => {
    expect(roundRobinPairings(["a", "b", "c"])).toEqual([
      { teamAId: "a", teamBId: "b" },
      { teamAId: "a", teamBId: "c" },
      { teamAId: "b", teamBId: "c" },
    ]);
  });
});

describe("computeGroupStandings", () => {
  it("ordena por vitórias e depois saldo de games", () => {
    const matches: GroupMatch[] = [
      { teamAId: "t0", teamBId: "t1", scoreA: 6, scoreB: 2 },
      { teamAId: "t0", teamBId: "t2", scoreA: 6, scoreB: 3 },
      { teamAId: "t1", teamBId: "t2", scoreA: 6, scoreB: 4 },
    ];
    const { standings } = computeGroupStandings("A", ["t0", "t1", "t2"], matches);
    expect(standings.map((s) => s.teamId)).toEqual(["t0", "t1", "t2"]);
    expect(standings[0]).toMatchObject({ teamId: "t0", wins: 2, gamesBalance: 7 });
    expect(standings[1]).toMatchObject({ teamId: "t1", wins: 1, gamesBalance: -2 });
    expect(standings[2]).toMatchObject({ teamId: "t2", wins: 0, gamesBalance: -5 });
  });

  it("ignora jogos sem placar", () => {
    const matches: GroupMatch[] = [
      { teamAId: "a", teamBId: "b", scoreA: null, scoreB: null },
    ];
    const { standings } = computeGroupStandings("A", ["a", "b"], matches);
    expect(standings.every((s) => s.wins === 0 && s.gamesBalance === 0)).toBe(true);
  });

  it("desempata por games a favor e depois por confronto direto", () => {
    // Q e P: 2V, saldo +4; Q tem mais games a favor (16 > 14) -> Q na frente.
    // R e S: 1V, saldo -4, GP 12 (empate total) -> confronto direto: R venceu S.
    const matches: GroupMatch[] = [
      { teamAId: "P", teamBId: "R", scoreA: 6, scoreB: 2 },
      { teamAId: "P", teamBId: "S", scoreA: 6, scoreB: 2 },
      { teamAId: "P", teamBId: "Q", scoreA: 2, scoreB: 6 },
      { teamAId: "Q", teamBId: "R", scoreA: 6, scoreB: 4 },
      { teamAId: "Q", teamBId: "S", scoreA: 4, scoreB: 6 },
      { teamAId: "R", teamBId: "S", scoreA: 6, scoreB: 4 },
    ];
    const { standings } = computeGroupStandings("A", ["P", "Q", "R", "S"], matches);
    expect(standings.map((s) => s.teamId)).toEqual(["Q", "P", "R", "S"]);
    expect(standings[0]).toMatchObject({ teamId: "Q", wins: 2, gamesBalance: 4, gamesFor: 16 });
    expect(standings[1]).toMatchObject({ teamId: "P", wins: 2, gamesBalance: 4, gamesFor: 14 });
    // R e S empatados em tudo; R venceu o confronto direto (6x4).
    expect(standings[2].teamId).toBe("R");
    expect(standings[3].teamId).toBe("S");
  });
});
