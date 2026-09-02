import { describe, it, expect } from "vitest";
import { formGroups } from "./groups";
import { DrawError, type SeededTeam } from "./types";

const teams = (n: number): SeededTeam[] =>
  Array.from({ length: n }, (_, i) => ({ id: `t${i}`, strength: (i + 1) * 10 }));

describe("formGroups", () => {
  it("8 duplas em 2 grupos → 2 grupos de 4", () => {
    const groups = formGroups(teams(8), 2);
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.teams.length === 4)).toBe(true);
    expect(groups.map((g) => g.label)).toEqual(["A", "B"]);
  });

  it("9 duplas em 3 grupos → 3 grupos de 3", () => {
    const groups = formGroups(teams(9), 3);
    expect(groups).toHaveLength(3);
    expect(groups.every((g) => g.teams.length === 3)).toBe(true);
    expect(groups.map((g) => g.label)).toEqual(["A", "B", "C"]);
  });

  it("usa cada dupla exatamente uma vez", () => {
    const groups = formGroups(teams(8), 2);
    const ids = groups.flatMap((g) => g.teams.map((t) => t.id)).sort();
    expect(ids).toEqual(teams(8).map((t) => t.id).sort());
  });

  it("equilibra a força entre os grupos (serpentina)", () => {
    const groups = formGroups(teams(8), 2);
    const sums = groups.map((g) => g.teams.reduce((s, t) => s + t.strength, 0));
    const diff = Math.max(...sums) - Math.min(...sums);
    expect(diff).toBeLessThanOrEqual(20);
  });

  it("distribui o resto em grupos de tamanho ±1", () => {
    // 10 duplas em 3 grupos → tamanhos 4,3,3
    const groups = formGroups(teams(10), 3);
    expect(groups).toHaveLength(3);
    const sizes = groups.map((g) => g.teams.length).sort();
    expect(sizes).toEqual([3, 3, 4]);
  });

  it("respeita o número de grupos pedido (ex.: 4 grupos com 12 duplas)", () => {
    const groups = formGroups(teams(12), 4);
    expect(groups).toHaveLength(4);
    expect(groups.every((g) => g.teams.length === 3)).toBe(true);
  });

  it("rejeita número de grupos inválido", () => {
    expect(() => formGroups(teams(8), 0)).toThrow(DrawError);
    expect(() => formGroups(teams(8), 9)).toThrow(DrawError);
  });
});
