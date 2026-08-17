"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import {
  AdminSchema,
  PasswordChangeSchema,
  ScoringSchema,
  type AdminInput,
  type PasswordChangeInput,
  type ScoringInput,
} from "@/lib/schemas/config";

export type ActionResult = { ok: true } | { ok: false; error: string };

const PATH = "/configuracoes";

export async function updateScoring(
  championshipId: string,
  input: ScoringInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = ScoringSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  await prisma.championship.update({ where: { id: championshipId }, data: parsed.data });
  revalidatePath(PATH);
  revalidatePath("/ranking");
  return { ok: true };
}

export async function createAdmin(input: AdminInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = AdminSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { nome, email, senha } = parsed.data;

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "Já existe um admin com esse e-mail." };

  const passwordHash = await bcrypt.hash(senha, 10);
  await prisma.admin.create({ data: { nome, email, passwordHash } });
  revalidatePath(PATH);
  return { ok: true };
}

export async function changePassword(input: PasswordChangeInput): Promise<ActionResult> {
  const session = await requireAdmin();
  const parsed = PasswordChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const email = session.user?.email;
  if (!email) return { ok: false, error: "Sessão inválida." };
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) return { ok: false, error: "Administrador não encontrado." };
  const ok = await bcrypt.compare(parsed.data.atual, admin.passwordHash);
  if (!ok) return { ok: false, error: "Senha atual incorreta." };
  const passwordHash = await bcrypt.hash(parsed.data.nova, 10);
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash } });
  return { ok: true };
}

export async function revokeAdmin(id: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = await prisma.admin.findUnique({ where: { id } });
  if (!admin) return { ok: false, error: "Admin não encontrado." };
  if (admin.isOwner) return { ok: false, error: "O administrador dono não pode ser revogado." };
  await prisma.admin.delete({ where: { id } });
  revalidatePath(PATH);
  return { ok: true };
}
