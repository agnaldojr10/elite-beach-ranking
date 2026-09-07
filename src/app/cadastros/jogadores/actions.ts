"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { PlayerInputSchema, type PlayerInput } from "@/lib/schemas/player";
import { gerarConvite } from "@/server/player-access.service";
import { sendTestPush } from "@/server/push.service";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type LinkResult = { ok: true; token: string } | { ok: false; error: string };
export type TestPushActionResult = { ok: true; sent: number; total: number } | { ok: false; error: string };

const PATH = "/cadastros/jogadores";

export async function createPlayer(input: PlayerInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = PlayerInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { nome, email, photoUrl, type } = parsed.data;
  await prisma.player.create({
    data: { nome, email: email || null, photoUrl: photoUrl || null, type },
  });
  revalidatePath(PATH);
  return { ok: true };
}

export async function updatePlayer(id: string, input: PlayerInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = PlayerInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { nome, email, photoUrl, type } = parsed.data;
  await prisma.player.update({
    where: { id },
    data: { nome, email: email || null, photoUrl: photoUrl || null, type },
  });
  revalidatePath(PATH);
  return { ok: true };
}

export async function archivePlayer(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.player.update({ where: { id }, data: { active: false } });
  revalidatePath(PATH);
  return { ok: true };
}

/** Gera o link de acesso do atleta (1º acesso). Devolve o token; o cliente monta a URL. */
export async function gerarLinkConvite(playerId: string): Promise<LinkResult> {
  await requireAdmin();
  try {
    const token = await gerarConvite(playerId);
    return { ok: true, token };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao gerar o link." };
  }
}

/** Dispara um push de teste para o atleta (admin) — valida a entrega sob demanda. */
export async function enviarPushTeste(playerId: string): Promise<TestPushActionResult> {
  await requireAdmin();
  const r = await sendTestPush(playerId);
  if (!r.ok) return { ok: false, error: r.reason ?? "Não foi possível enviar." };
  return { ok: true, sent: r.sent, total: r.total };
}
