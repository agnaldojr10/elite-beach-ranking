"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { generateDraw } from "@/server/draw.service";
import { syncKnockout } from "@/server/knockout.service";
import { buildRoundExport, encerrarRodada } from "@/server/round-close.service";
import { isValidBeachScore } from "@/lib/score";
import { notifyPlayers, playersDaRodada } from "@/server/push.service";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type ExportResult = { ok: true; text: string } | { ok: false; error: string };
export type PodioItem = { tierLabel: string; pts: number; nomes: string[]; photos: (string | null)[] };
export type PodioResult = { ok: true; numero: number | null; itens: PodioItem[] } | { ok: false; error: string };
export type SortearResult =
  | { ok: true; repeated: { player1: string; player2: string; timesBefore: number }[] }
  | { ok: false; error: string };

export async function toggleAttendance(roundId: string, playerId: string): Promise<ActionResult> {
  await requireAdmin();
  const key = { roundId_playerId: { roundId, playerId } };
  const existing = await prisma.attendance.findUnique({ where: key });
  if (existing) await prisma.attendance.delete({ where: key });
  else await prisma.attendance.create({ data: { roundId, playerId } });
  revalidatePath(`/sorteio/${roundId}`);
  return { ok: true };
}

export async function quickAddGuest(roundId: string, nome: string): Promise<ActionResult> {
  await requireAdmin();
  const n = nome.trim();
  if (n.length < 2) return { ok: false, error: "Informe o nome do jogador." };
  // cadastro rápido cria um JOGADOR (REGULAR) por padrão
  const player = await prisma.player.create({ data: { nome: n, type: "REGULAR" } });
  await prisma.attendance.create({ data: { roundId, playerId: player.id } });
  revalidatePath(`/sorteio/${roundId}`);
  return { ok: true };
}

export async function sortear(roundId: string): Promise<SortearResult> {
  await requireAdmin();
  try {
    const res = await generateDraw(roundId);
    revalidatePath(`/sorteio/${roundId}`);
    return { ok: true, repeated: res.repeated };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao sortear." };
  }
}

export async function saveScore(
  roundId: string,
  matchId: string,
  scoreA: number,
  scoreB: number,
): Promise<ActionResult> {
  await requireAdmin();
  if (!isValidBeachScore(scoreA, scoreB)) {
    return { ok: false, error: "Placar inválido para o beach tennis (ex.: 6×0..6×4, 7×5, 7×6)." };
  }
  const match = await prisma.match.update({
    where: { id: matchId },
    data: { scoreA, scoreB, status: "JOGADO" },
    select: { phase: true },
  });
  // Placar de mata-mata: tenta avançar as fases (idempotente).
  if (match.phase !== "GRUPOS") {
    try {
      await syncKnockout(roundId);
    } catch {
      /* fase ainda incompleta — ignora */
    }
  }
  revalidatePath(`/sorteio/${roundId}`);
  return { ok: true };
}

export async function gerarMataMata(roundId: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await syncKnockout(roundId);
    revalidatePath(`/sorteio/${roundId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao gerar o mata-mata." };
  }
}

export async function saveDrawConfig(
  roundId: string,
  cfg: { numGroups: number; balanceByRanking: boolean; avoidRepeat: boolean; randomness: number },
): Promise<ActionResult> {
  await requireAdmin();
  const numGroups = Math.round(cfg.numGroups);
  const randomness = Math.round(cfg.randomness);
  if (numGroups < 1 || numGroups > 8) return { ok: false, error: "Número de grupos deve ser de 1 a 8." };
  if (randomness < 0 || randomness > 100) return { ok: false, error: "Aleatoriedade deve ser 0 a 100." };
  await prisma.round.update({
    where: { id: roundId },
    data: {
      drawNumGroups: numGroups,
      drawBalanceByRanking: cfg.balanceByRanking,
      drawAvoidRepeat: cfg.avoidRepeat,
      drawRandomness: randomness,
      configConfirmed: true,
    },
  });
  revalidatePath(`/sorteio/${roundId}`);
  return { ok: true };
}

export async function trocarParceiro(
  roundId: string,
  teamAId: string,
  teamBId: string,
): Promise<ActionResult> {
  await requireAdmin();
  if (teamAId === teamBId) return { ok: false, error: "Selecione duas duplas diferentes." };
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { duplasConfirmed: true },
  });
  if (round?.duplasConfirmed) {
    return { ok: false, error: "Duplas já confirmadas — refaça o sorteio para alterar." };
  }
  const a = await prisma.team.findUnique({ where: { id: teamAId }, select: { player2Id: true } });
  const b = await prisma.team.findUnique({ where: { id: teamBId }, select: { player2Id: true } });
  if (!a || !b) return { ok: false, error: "Dupla não encontrada." };
  // troca o 2º integrante entre as duas duplas (mantém grupos e jogos)
  await prisma.$transaction([
    prisma.team.update({ where: { id: teamAId }, data: { player2Id: b.player2Id } }),
    prisma.team.update({ where: { id: teamBId }, data: { player2Id: a.player2Id } }),
  ]);
  revalidatePath(`/sorteio/${roundId}`);
  return { ok: true };
}

export async function confirmarDuplas(roundId: string): Promise<ActionResult> {
  await requireAdmin();
  const teams = await prisma.team.count({ where: { roundId } });
  if (teams === 0) return { ok: false, error: "Sorteie as duplas antes de confirmar." };
  await prisma.round.update({ where: { id: roundId }, data: { duplasConfirmed: true } });
  revalidatePath(`/sorteio/${roundId}`);
  try {
    const ids = await playersDaRodada(roundId);
    await notifyPlayers(ids, {
      title: "Duplas sorteadas! 🎾",
      body: "Veja sua dupla, grupo e seus jogos da rodada.",
      url: "/inicio",
    });
  } catch {
    /* push é best-effort */
  }
  return { ok: true };
}

export async function registrarPodioFinals(
  roundId: string,
  podium: { campeao: [string, string]; vice: [string, string]; terceiro: [string, string] },
): Promise<ActionResult> {
  await requireAdmin();
  const ids = [...podium.campeao, ...podium.vice, ...podium.terceiro];
  if (ids.some((x) => !x)) return { ok: false, error: "Selecione os 6 jogadores do pódio." };
  if (new Set(ids).size !== 6) return { ok: false, error: "Um jogador não pode aparecer duas vezes." };

  const round = await prisma.round.findUnique({ where: { id: roundId }, select: { isFinals: true } });
  if (!round?.isFinals) return { ok: false, error: "Esta não é a rodada da FINALS." };

  // Pódio da FINALS é um REGISTRO (0 pontos) — não afeta o ranking das etapas.
  const data = [
    ...podium.campeao.map((playerId) => ({ roundId, playerId, tier: "CAMPEAO" as const, pointsAwarded: 0 })),
    ...podium.vice.map((playerId) => ({ roundId, playerId, tier: "VICE" as const, pointsAwarded: 0 })),
    ...podium.terceiro.map((playerId) => ({ roundId, playerId, tier: "TERCEIRO" as const, pointsAwarded: 0 })),
  ];

  await prisma.$transaction([
    prisma.roundResult.deleteMany({ where: { roundId } }),
    prisma.roundResult.createMany({ data }),
    prisma.round.update({ where: { id: roundId }, data: { status: "ENCERRADA" } }),
  ]);
  revalidatePath(`/sorteio/${roundId}`);
  return { ok: true };
}

export async function encerrar(roundId: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await encerrarRodada(roundId);
    revalidatePath(`/sorteio/${roundId}`);
    revalidatePath("/ranking");
    try {
      const ids = await playersDaRodada(roundId);
      await notifyPlayers(ids, {
        title: "Resultado da rodada 🏆",
        body: "O ranking foi atualizado. Veja como você ficou.",
        url: "/classificacao",
      });
    } catch {
      /* push é best-effort */
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao encerrar a rodada." };
  }
}

export async function reabrirRodada(roundId: string): Promise<ActionResult> {
  await requireAdmin();
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { status: true, isFinals: true },
  });
  if (!round) return { ok: false, error: "Rodada não encontrada." };
  if (round.status !== "ENCERRADA") return { ok: false, error: "A rodada não está encerrada." };
  // Remove os pontos aplicados e volta a rodada para edição (times/jogos ficam).
  await prisma.$transaction([
    prisma.roundResult.deleteMany({ where: { roundId } }),
    prisma.round.update({
      where: { id: roundId },
      data: { status: round.isFinals ? "AGENDADA" : "SORTEADA" },
    }),
  ]);
  revalidatePath(`/sorteio/${roundId}`);
  revalidatePath("/ranking");
  return { ok: true };
}

export async function refazerMataMata(roundId: string): Promise<ActionResult> {
  await requireAdmin();
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { status: true },
  });
  if (!round) return { ok: false, error: "Rodada não encontrada." };
  if (round.status === "ENCERRADA") {
    return { ok: false, error: "Reabra a rodada antes de refazer o mata-mata." };
  }
  // Apaga o mata-mata atual; será recriado a partir da classificação corrigida.
  await prisma.match.deleteMany({ where: { roundId, phase: { not: "GRUPOS" } } });
  revalidatePath(`/sorteio/${roundId}`);
  return { ok: true };
}

export async function podioRodada(roundId: string): Promise<PodioResult> {
  await requireAdmin();
  const round = await prisma.round.findUnique({ where: { id: roundId }, select: { numero: true } });
  if (!round) return { ok: false, error: "Rodada não encontrada." };

  const rr = await prisma.roundResult.findMany({
    where: { roundId, tier: { in: ["CAMPEAO", "VICE", "TERCEIRO", "QUARTO"] } },
    select: { tier: true, pointsAwarded: true, player: { select: { nome: true, photoUrl: true } } },
  });

  const LABEL: Record<string, string> = { CAMPEAO: "Campeão", VICE: "Vice", TERCEIRO: "3º lugar", QUARTO: "4º lugar" };
  const ORDER = ["CAMPEAO", "VICE", "TERCEIRO", "QUARTO"];
  const byTier = new Map<string, { pts: number; players: { nome: string; photoUrl: string | null }[] }>();
  for (const r of rr) {
    if (!byTier.has(r.tier)) byTier.set(r.tier, { pts: r.pointsAwarded, players: [] });
    byTier.get(r.tier)!.players.push(r.player);
  }
  const itens: PodioItem[] = ORDER.filter((t) => byTier.has(t)).map((t) => {
    const g = byTier.get(t)!;
    return { tierLabel: LABEL[t], pts: g.pts, nomes: g.players.map((p) => p.nome), photos: g.players.map((p) => p.photoUrl) };
  });
  return { ok: true, numero: round.numero, itens };
}

export async function exportRodada(roundId: string): Promise<ExportResult> {
  await requireAdmin();
  try {
    const text = await buildRoundExport(roundId);
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao gerar o resumo." };
  }
}

export async function setPeso(roundId: string, peso: number): Promise<ActionResult> {
  await requireAdmin();
  if (peso !== 1 && peso !== 2) return { ok: false, error: "Peso deve ser 1x ou 2x." };
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { status: true },
  });
  if (!round) return { ok: false, error: "Rodada não encontrada." };
  if (round.status === "ENCERRADA") {
    return { ok: false, error: "Rodada encerrada — o peso não pode mais ser alterado." };
  }
  await prisma.round.update({ where: { id: roundId }, data: { peso } });
  revalidatePath(`/sorteio/${roundId}`);
  return { ok: true };
}
