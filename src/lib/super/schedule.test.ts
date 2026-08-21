import { describe, expect, it } from "vitest";
import { buildSuperSchedule, SUPER_SIZES } from "./schedule";

function pairKey(a: number, b: number) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

describe("buildSuperSchedule (rodízio Super)", () => {
  for (const n of SUPER_SIZES) {
    describe(`N=${n}`, () => {
      const rounds = buildSuperSchedule(n);

      it("tem N-1 rodadas com N/4 jogos cada", () => {
        expect(rounds).toHaveLength(n - 1);
        for (const r of rounds) expect(r.games).toHaveLength(n / 4);
      });

      it("cada atleta joga exatamente uma vez por rodada", () => {
        for (const r of rounds) {
          const seats = r.games.flatMap((g) => [g.a1, g.a2, g.b1, g.b2]);
          expect(new Set(seats).size).toBe(n);
          expect(seats.every((s) => s >= 0 && s < n)).toBe(true);
        }
      });

      it("cada dupla (parceria) ocorre exatamente 1× — todos jogam com todos", () => {
        const partnerships = new Map<string, number>();
        for (const r of rounds) {
          for (const g of r.games) {
            for (const [x, y] of [
              [g.a1, g.a2],
              [g.b1, g.b2],
            ]) {
              const k = pairKey(x, y);
              partnerships.set(k, (partnerships.get(k) ?? 0) + 1);
            }
          }
        }
        // total de parcerias possíveis = C(n,2)
        expect(partnerships.size).toBe((n * (n - 1)) / 2);
        for (const count of partnerships.values()) expect(count).toBe(1);
      });

      it("cada atleta tem N-1 parceiros distintos (joga N-1 jogos)", () => {
        const partnersOf = new Map<number, Set<number>>();
        for (let s = 0; s < n; s++) partnersOf.set(s, new Set());
        for (const r of rounds) {
          for (const g of r.games) {
            partnersOf.get(g.a1)!.add(g.a2);
            partnersOf.get(g.a2)!.add(g.a1);
            partnersOf.get(g.b1)!.add(g.b2);
            partnersOf.get(g.b2)!.add(g.b1);
          }
        }
        for (const set of partnersOf.values()) expect(set.size).toBe(n - 1);
      });
    });
  }
});
