"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePlayer } from "@/lib/auth-guard";
import { savePushSubscription, removePushSubscription } from "@/server/push.service";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function inscreverPush(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<ActionResult> {
  const { playerId } = await requirePlayer();
  await savePushSubscription(playerId, sub);
  return { ok: true };
}

export async function cancelarPush(endpoint: string): Promise<ActionResult> {
  await requirePlayer();
  await removePushSubscription(endpoint);
  return { ok: true };
}

export async function atualizarFotoAtleta(url: string | null): Promise<ActionResult> {
  const { playerId } = await requirePlayer();
  await prisma.player.update({ where: { id: playerId }, data: { photoUrl: url || null } });
  revalidatePath("/perfil");
  revalidatePath("/inicio");
  return { ok: true };
}

export async function alterarSenhaAtleta(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const { playerId } = await requirePlayer();
  const atual = String(formData.get("atual") ?? "");
  const nova = String(formData.get("nova") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");

  if (nova.length < 8) return "A nova senha precisa ter ao menos 8 caracteres.";
  if (nova !== confirmar) return "A confirmação não confere.";

  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { passwordHash: true } });
  if (!player?.passwordHash) return "Conta sem senha definida.";
  const ok = await bcrypt.compare(atual, player.passwordHash);
  if (!ok) return "Senha atual incorreta.";

  const hash = await bcrypt.hash(nova, 10);
  await prisma.player.update({ where: { id: playerId }, data: { passwordHash: hash } });
  return "OK";
}
