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
});
