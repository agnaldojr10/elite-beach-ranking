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

export async function confirmarDuplas(roundId: string): Promise<ActionResult> {
  await requireAdmin();
  const teams = await prisma.team.count({ where: { roundId } });
  if (teams === 0) return { ok: false, error: "Sorteie as duplas antes de confirmar." };
  await prisma.round.update({ where: { id: roundId }, data: { duplasConfirmed: true } });
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
