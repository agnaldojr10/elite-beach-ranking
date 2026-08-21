"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import {
  buildSuperExport,
  createSuperTournament,
  saveSuperScore,
} from "@/server/super.service";
import type { SuperCreateInput } from "@/lib/schemas/super";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type CreateResult = { ok: true; id: string } | { ok: false; error: string };
export type ExportResult = { ok: true; text: string } | { ok: false; error: string };

export async function criarTorneio(input: SuperCreateInput): Promise<CreateResult> {
  await requireAdmin();
  try {
    const { id } = await createSuperTournament(input);
    revalidatePath("/torneios");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao criar o torneio." };
  }
}

export async function salvarPlacarSuper(
  tournamentId: string,
  matchId: string,
  scoreA: number,
  scoreB: number,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await saveSuperScore(matchId, scoreA, scoreB);
    revalidatePath(`/torneios/${tournamentId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao salvar o placar." };
  }
}

export async function setStatusTorneio(
  tournamentId: string,
  status: "ABERTO" | "ENCERRADO",
): Promise<ActionResult> {
  await requireAdmin();
  await prisma.superTournament.update({ where: { id: tournamentId }, data: { status } });
  revalidatePath(`/torneios/${tournamentId}`);
  revalidatePath("/torneios");
  return { ok: true };
}

export async function excluirTorneio(tournamentId: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.superTournament.delete({ where: { id: tournamentId } });
  revalidatePath("/torneios");
  return { ok: true };
}

export async function exportTorneio(tournamentId: string): Promise<ExportResult> {
  await requireAdmin();
  try {
    const text = await buildSuperExport(tournamentId);
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao gerar o resumo." };
  }
}
