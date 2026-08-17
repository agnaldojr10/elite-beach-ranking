"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { PlayerInputSchema, type PlayerInput } from "@/lib/schemas/player";

export type ActionResult = { ok: true } | { ok: false; error: string };

const PATH = "/cadastros/jogadores";

export async function createPlayer(input: PlayerInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = PlayerInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { nome, email, type } = parsed.data;
  await prisma.player.create({ data: { nome, email: email || null, type } });
  revalidatePath(PATH);
  return { ok: true };
}

export async function updatePlayer(id: string, input: PlayerInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = PlayerInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { nome, email, type } = parsed.data;
  await prisma.player.update({ where: { id }, data: { nome, email: email || null, type } });
  revalidatePath(PATH);
  return { ok: true };
}

export async function archivePlayer(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.player.update({ where: { id }, data: { active: false } });
  revalidatePath(PATH);
  return { ok: true };
}
