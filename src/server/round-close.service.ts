import { prisma } from "@/lib/prisma";
import type { ResultTier } from "@prisma/client";
import { getRankingGeral } from "@/server/ranking.service";

type KoMatch = {
  phase: "GRUPOS" | "QUARTAS" | "SEMIFINAL" | "FINAL" | "TERCEIRO";
  teamAId: string;
  teamBId: string;
  scoreA: number | null;
  scoreB: number | null;
};

function isResolved(m: { scoreA: number | null; scoreB: number | null }): boolean {
  return m.scoreA != null && m.scoreB != null && m.scoreA !== m.scoreB;
}
function winnerTeam(m: KoMatch): string {
  return (m.scoreA as number) > (m.scoreB as number) ? m.teamAId : m.teamBId;
}
function loserTeam(m: KoMatch): string {
  return (m.scoreA as number) > (m.scoreB as number) ? m.teamBId : m.teamAId;
}

/**
 * Encerra a rodada: apura a colocação pelo mata-mata, aplica os pontos da
 * tabela do campeonato × peso da etapa (convidado não pontua) e grava
 * RoundResult (congelado). Idempotente até re-encerrar.
 */
export async function encerrarRodada(roundId: string): Promise<{ count: number }> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { championship: true },
  });
  if (!round) throw new Error("Rodada não encontrada.");
  if (round.isFinals) throw new Error("A FINALS é registrada à parte (pódio manual).");
  if (round.status === "ENCERRADA") throw new Error("Rodada já encerrada.");

  const c = round.championship;

  const ko = (await prisma.match.findMany({
    where: { roundId, phase: { in: ["QUARTAS", "SEMIFINAL", "FINAL", "TERCEIRO"] } },
    select: { phase: true, teamAId: true, teamBId: true, scoreA: true, scoreB: true },
  })) as KoMatch[];

  const final = ko.find((m) => m.phase === "FINAL");
  if (!final || !isResolved(final)) {
    throw new Error("Lance o placar da final antes de encerrar a rodada.");
  }

  const teams = await prisma.team.findMany({
    where: { roundId },
    include: {
      player1: { select: { id: true, type: true } },
      player2: { select: { id: true, type: true } },
    },
  });

  // Tier por dupla: todos participação por padrão; sobrepõe pelo mata-mata.
  const tierByTeam = new Map<string, ResultTier>();
  for (const t of teams) tierByTeam.set(t.id, "PARTICIPACAO");
  for (const m of ko) {
    if (m.phase === "QUARTAS" && isResolved(m)) tierByTeam.set(loserTeam(m), "QUARTAS");
  }
  const terceiro = ko.find((m) => m.phase === "TERCEIRO");
  if (terceiro && isResolved(terceiro)) {
    tierByTeam.set(winnerTeam(terceiro), "TERCEIRO");
    tierByTeam.set(loserTeam(terceiro), "QUARTO");
  }
  tierByTeam.set(winnerTeam(final), "CAMPEAO");
  tierByTeam.set(loserTeam(final), "VICE");

  const ptsByTier: Record<ResultTier, number> = {
    CAMPEAO: c.ptsCampeao,
    VICE: c.ptsVice,
    TERCEIRO: c.pts3,
    QUARTO: c.pts4,
    QUARTAS: c.ptsQuartas,
    PARTICIPACAO: c.ptsParticipacao,
  };
  const peso = round.peso;

  const results = teams.flatMap((t) => {
    const tier = tierByTeam.get(t.id) ?? "PARTICIPACAO";
    const base = ptsByTier[tier] * peso;
    return [t.player1, t.player2].map((pl) => ({
      roundId,
      playerId: pl.id,
      tier,
      pointsAwarded: pl.type === "GUEST" ? 0 : base, // convidado não pontua
    }));
  });

  await prisma.$transaction([
    prisma.roundResult.deleteMany({ where: { roundId } }),
    prisma.roundResult.createMany({ data: results }),
    prisma.round.update({ where: { id: roundId }, data: { status: "ENCERRADA" } }),
  ]);

  return { count: results.length };
}

const TIER_MEDAL: Record<string, string> = {
  CAMPEAO: "🥇 Campeão",
  VICE: "🥈 Vice",
  TERCEIRO: "🥉 3º lugar",
  QUARTO: "4️⃣ 4º lugar",
};
const brDate = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });

/**
 * Monta o texto de compartilhamento de uma rodada encerrada:
 * pódio da rodada + ranking geral atual. Pronto para o WhatsApp.
 */
export async function buildRoundExport(roundId: string): Promise<string> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { championship: { select: { id: true, nome: true } } },
  });
  if (!round) throw new Error("Rodada não encontrada.");

  const results = await prisma.roundResult.findMany({
    where: { roundId },
    select: { tier: true, player: { select: { nome: true } } },
  });

  const primeiro = (nome: string) => nome.split(" ")[0];
  const byTier = new Map<string, string[]>();
  for (const r of results) {
    if (!byTier.has(r.tier)) byTier.set(r.tier, []);
    byTier.get(r.tier)!.push(primeiro(r.player.nome));
  }

  const podioLinhas: string[] = [];
  for (const tier of ["CAMPEAO", "VICE", "TERCEIRO", "QUARTO"]) {
    const nomes = byTier.get(tier);
    if (nomes && nomes.length > 0) {
      podioLinhas.push(`${TIER_MEDAL[tier]}: ${nomes.join(" & ")}`);
    }
  }

  const { rows } = await getRankingGeral(round.championship.id);
  const rankLinhas = rows.map((r) => `${r.posicao}. ${r.nome} — ${r.pontos} pts`);

  const titulo = round.isFinals ? "FINALS" : `Rodada ${round.numero}`;
  const partes = [
    `🎾 ${round.championship.nome}`,
    `📋 ${titulo} · ${brDate(round.data)}`,
    "",
    "🏆 Resultado da rodada",
    ...(podioLinhas.length > 0 ? podioLinhas : ["(sem pódio registrado)"]),
    "",
    "📊 Ranking geral",
    ...(rankLinhas.length > 0 ? rankLinhas : ["(sem pontos ainda)"]),
  ];

  return partes.join("\n");
}
