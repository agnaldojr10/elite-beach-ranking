"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { generateDraw } from "@/server/draw.service";

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
