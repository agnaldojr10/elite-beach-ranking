"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { CHAMP_COOKIE } from "@/lib/active-champ";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Grava no cookie qual campeonato o admin está visualizando. */
export async function selecionarCampeonato(id: string): Promise<ActionResult> {
  await requireAdmin();
  const champ = await prisma.championship.findUnique({ where: { id }, select: { id: true } });
  if (!champ) return { ok: false, error: "Campeonato não encontrado." };

  const store = await cookies();
  store.set(CHAMP_COOKIE, id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: "lax",
  });

  revalidatePath("/");
  revalidatePath("/ranking");
  revalidatePath("/sorteio");
  revalidatePath("/configuracoes");
  return { ok: true };
}
