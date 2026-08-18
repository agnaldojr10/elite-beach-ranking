import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { getRankingGeral } from "@/server/ranking.service";
import { RankingView } from "@/components/RankingView";
import { getActiveChampionshipOrSelect } from "@/lib/active-champ";

export const dynamic = "force-dynamic";

const TIER_ORDER: Record<string, number> = {
  CAMPEAO: 0,
  VICE: 1,
  TERCEIRO: 2,
  QUARTO: 3,
  QUARTAS: 4,
  PARTICIPACAO: 5,
};
const TIER_LABEL: Record<string, string> = {
  CAMPEAO: "Campeão",
  VICE: "Vice-campeão",
  TERCEIRO: "3º lugar",
  QUARTO: "4º lugar",
  QUARTAS: "Quartas",
  PARTICIPACAO: "Fase de grupos",
};

export default async function RankingPage() {
  const champ = await getActiveChampionshipOrSelect();
  if (!champ) {
    return (
      <AppShell title="Ranking">
        <p className="py-10 text-center text-sm text-muted">
          Nenhum campeonato ativo. Ative um em Cadastros › Campeonatos.
        </p>
      </AppShell>
    );
  }

  const { rows, pneu } = await getRankingGeral(champ.id);

  const rr = await prisma.roundResult.findMany({
    where: { round: { championshipId: champ.id, isFinals: false } },
    select: {
      tier: true,
      pointsAwarded: true,
      player: { select: { nome: true } },
      round: { select: { id: true, numero: true } },
    },
  });

  const byRound = new Map<
    string,
    { id: string; numero: number | null; results: { nome: string; tier: string; pts: number }[] }
  >();
  for (const r of rr) {
    const k = r.round.id;
    if (!byRound.has(k)) byRound.set(k, { id: k, numero: r.round.numero, results: [] });
    byRound.get(k)!.results.push({ nome: r.player.nome, tier: r.tier, pts: r.pointsAwarded });
  }

  const rodadas = [...byRound.values()]
    .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
    .map((rd) => ({
      id: rd.id,
      numero: rd.numero ?? 0,
      results: rd.results
        .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.nome.localeCompare(b.nome))
        .map((x, i) => ({ pos: i + 1, nome: x.nome, tierLabel: TIER_LABEL[x.tier] ?? "", pts: x.pts })),
    }));

  return (
    <AppShell title="Ranking">
      <p className="mb-3 text-xs text-muted">{champ.nome}</p>
      <RankingView rows={rows} pneu={pneu} rodadas={rodadas} titulo={champ.nome} />
    </AppShell>
  );
}
