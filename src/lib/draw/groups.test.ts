import { describe, it, expect } from "vitest";
import { formGroups } from "./groups";
import { DrawError, type SeededTeam } from "./types";

const teams = (n: number): SeededTeam[] =>
  Array.from({ length: n }, (_, i) => ({ id: `t${i}`, strength: (i + 1) * 10 }));

describe("formGroups", () => {
  it("16 jogadores (8 duplas, tamanho 4) → 2 grupos de 4", () => {
    const groups = formGroups(teams(8), 4);
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.teams.length === 4)).toBe(true);
    expect(groups.map((g) => g.label)).toEqual(["A", "B"]);
  });

  it("18 jogadores (9 duplas, tamanho 3) → 3 grupos de 3", () => {
    const groups = formGroups(teams(9), 3);
    expect(groups).toHaveLength(3);
    expect(groups.every((g) => g.teams.length === 3)).toBe(true);
    expect(groups.map((g) => g.label)).toEqual(["A", "B", "C"]);
  });

  it("usa cada dupla exatamente uma vez", () => {
    const groups = formGroups(teams(8), 4);
    const ids = groups.flatMap((g) => g.teams.map((t) => t.id)).sort();
    expect(ids).toEqual(teams(8).map((t) => t.id).sort());
  });

  it("equilibra a força entre os grupos (serpentina)", () => {
    // 8 duplas com forças 10..80 → 2 grupos; somas devem ficar próximas.
    const groups = formGroups(teams(8), 4);
    const sums = groups.map((g) => g.teams.reduce((s, t) => s + t.strength, 0));
    const diff = Math.max(...sums) - Math.min(...sums);
    expect(diff).toBeLessThanOrEqual(20); // parelho (perfeito seria 0)
  });

  it("distribui o resto em grupos de tamanho ±1", () => {
    // 10 duplas, tamanho 3 → 3 grupos (4,3,3)
    const groups = formGroups(teams(10), 3);
    expect(groups).toHaveLength(3);
    const sizes = groups.map((g) => g.teams.length).sort();
    expect(sizes).toEqual([3, 3, 4]);
  });

  it("rejeita tamanho de grupo inválido", () => {
    expect(() => formGroups(teams(8), 1)).toThrow(DrawError);
  });
});
