import { describe, it, expect } from "vitest";
import {
  buildSemifinalPairings,
  nextStagePairings,
  planKnockout,
} from "./bracket";
import type { GroupStandings } from "./standings";

const g = (
  groupName: string,
  rows: [string, number, number][],
): GroupStandings => ({
  groupName,
  standings: rows.map(([teamId, wins, gamesBalance]) => ({
    teamId,
    wins,
    gamesBalance,
  })),
});

describe("planKnockout — 16 jogadores (2 grupos de 4)", () => {
  it("classifica 2 de cada e monta semifinal cruzada", () => {
    const gA = g("A", [
      ["A1", 3, 20],
      ["A2", 2, 5],
      ["A3", 1, -5],
      ["A4", 0, -20],
    ]);
    const gB = g("B", [
      ["B1", 3, 18],
      ["B2", 2, 4],
      ["B3", 1, -6],
      ["B4", 0, -16],
    ]);
    const plan = planKnockout([gA, gB]);
    expect(plan.format).toBe("SEMI");
    expect(plan.firstStage).toBe("SF");
    expect(plan.firstPairings).toEqual([
      { slot: 0, teamAId: "A1", teamBId: "B2" }, // 1ºA × 2ºB
      { slot: 1, teamAId: "B1", teamBId: "A2" }, // 1ºB × 2ºA
    ]);
  });
});

describe("planKnockout — 18 jogadores (3 grupos de 3)", () => {
  it("dá bye aos 2 melhores e monta as quartas", () => {
    const gA = g("A", [["A1", 3, 30], ["A2", 1, 0], ["A3", 0, -30]]);
    const gB = g("B", [["B1", 3, 20], ["B2", 1, -5], ["B3", 0, -25]]);
    const gC = g("C", [["C1", 2, 10], ["C2", 2, 5], ["C3", 0, -20]]);
    const plan = planKnockout([gA, gB, gC]);

    expect(plan.format).toBe("QUARTER_WITH_BYES");
    expect(plan.firstStage).toBe("QF");
    expect(plan.avoidSemiRematch).toBe(true);
    // Ranking global: A1,B1 (3v) → bye; C1,C2 (2v) → s3,s4; A2,B2 (1v) → s5,s6.
    expect(plan.byes).toEqual(["A1", "B1"]);
    expect(plan.firstPairings).toHaveLength(2);
    // s4 (C2) no slot 0, s3 (C1) no slot 1.
    const slot0 = plan.firstPairings.find((p) => p.slot === 0)!;
    const slot1 = plan.firstPairings.find((p) => p.slot === 1)!;
    expect([slot0.teamAId, slot0.teamBId]).toContain("C2");
    expect([slot1.teamAId, slot1.teamBId]).toContain("C1");
  });
});

describe("buildSemifinalPairings — anti-revanche", () => {
  it("evita reencontro de grupo ao encaixar byes x vencedores", () => {
    // b0 e w0 são do mesmo grupo → optA seria revanche; deve escolher optB.
    const sameGroup = (a: string, b: string) =>
      (a === "b0" && b === "w0") || (a === "w0" && b === "b0");
    const pairings = buildSemifinalPairings(["b0", "b1"], ["w0", "w1"], sameGroup, true);
    const slot0 = pairings.find((p) => p.slot === 0)!;
    expect(slot0.teamBId).toBe("w1"); // b0 pega w1, não w0
  });
});

describe("nextStagePairings", () => {
  it("pareia vencedores em ordem de slot", () => {
    expect(nextStagePairings(["x", "y", "z", "w"])).toEqual([
      { slot: 0, teamAId: "x", teamBId: "y" },
      { slot: 1, teamAId: "z", teamBId: "w" },
    ]);
  });
});
