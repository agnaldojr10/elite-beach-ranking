"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { generateDraw } from "@/server/draw.service";
import { syncKnockout } from "@/server/knockout.service";
import { encerrarRodada } from "@/server/round-close.service";

export type ActionResult = { ok: true } | { ok: false; error: string };
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
  if (n.length < 2) return { ok: false, error: "Informe o nome do convidado." };
  const player = await prisma.player.create({ data: { nome: n, type: "GUEST" } });
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
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0) {
    return { ok: false, error: "Placar inválido." };
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
  cfg: { groupSize: number; balanceByRanking: boolean; avoidRepeat: boolean; randomness: number },
): Promise<ActionResult> {
  await requireAdmin();
  const groupSize = Math.round(cfg.groupSize);
  const randomness = Math.round(cfg.randomness);
  if (groupSize < 2 || groupSize > 6) return { ok: false, error: "Tamanho do grupo deve ser 2 a 6 duplas." };
  if (randomness < 0 || randomness > 100) return { ok: false, error: "Aleatoriedade deve ser 0 a 100." };
  await prisma.round.update({
    where: { id: roundId },
    data: {
      drawGroupSize: groupSize,
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
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao encerrar a rodada." };
  }
}
