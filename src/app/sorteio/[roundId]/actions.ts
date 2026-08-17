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
