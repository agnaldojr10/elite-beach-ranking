import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const INVITE_TTL_DAYS = 7;

/** Gera (renova) um convite de acesso de uso único para um atleta. */
export async function gerarConvite(playerId: string): Promise<string> {
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { id: true } });
  if (!player) throw new Error("Jogador não encontrado.");

  // invalida convites anteriores não usados
  await prisma.playerInvite.updateMany({
    where: { playerId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);
  await prisma.playerInvite.create({ data: { token, playerId, expiresAt } });
  return token;
}

export type ConviteValido = {
  ok: true;
  player: { id: string; nome: string; clube: string | null; photoUrl: string | null; jaTemAcesso: boolean };
};
export type ConviteInvalido = { ok: false; reason: "nao_encontrado" | "expirado" | "usado" };

/** Valida um token de convite (sem consumir). */
export async function validarConvite(token: string): Promise<ConviteValido | ConviteInvalido> {
  const invite = await prisma.playerInvite.findUnique({
    where: { token },
    include: {
      player: { select: { id: true, nome: true, clube: true, photoUrl: true, passwordHash: true, active: true } },
    },
  });
  if (!invite || !invite.player.active) return { ok: false, reason: "nao_encontrado" };
  if (invite.usedAt) return { ok: false, reason: "usado" };
  if (invite.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expirado" };
  return {
    ok: true,
    player: {
      id: invite.player.id,
      nome: invite.player.nome,
      clube: invite.player.clube,
      photoUrl: invite.player.photoUrl,
      jaTemAcesso: !!invite.player.passwordHash,
    },
  };
}

/** Consome o convite: grava senha + contato de login do atleta. */
export async function consumirConvite(
  token: string,
  passwordHash: string,
  loginContact: string,
): Promise<{ playerId: string; contato: string }> {
  const v = await validarConvite(token);
  if (!v.ok) throw new Error("Convite inválido ou expirado.");

  // contato já usado por OUTRO atleta?
  const emUso = await prisma.player.findUnique({
    where: { loginContact },
    select: { id: true },
  });
  if (emUso && emUso.id !== v.player.id) {
    throw new Error("Esse e-mail/telefone já está em uso por outro atleta.");
  }

  await prisma.$transaction([
    prisma.player.update({
      where: { id: v.player.id },
      data: { passwordHash, loginContact },
    }),
    prisma.playerInvite.update({ where: { token }, data: { usedAt: new Date() } }),
  ]);

  return { playerId: v.player.id, contato: loginContact };
}
