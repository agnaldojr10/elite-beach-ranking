"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import {
  ChampionshipInputSchema,
  GenerateRoundsSchema,
  type ChampionshipInput,
  type GenerateRoundsInput,
} from "@/lib/schemas/championship";

export type ActionResult = { ok: true } | { ok: false; error: string };

const PATH = "/cadastros/campeonatos";

function toDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function addDays(iso: string, days: number): Date {
  return new Date(toDate(iso).getTime() + days * 86_400_000);
}

export async function createChampionship(input: ChampionshipInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = ChampionshipInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  // Podem existir vários campeonatos em andamento ao mesmo tempo.
  await prisma.championship.create({
    data: {
      nome: v.nome,
      temporada: v.temporada,
      formato: v.formato,
      inicio: toDate(v.inicio),
      fim: toDate(v.fim),
      finalsDate: toDate(v.finalsDate),
      status: "ATIVA",
    },
  });
  revalidatePath(PATH);
  return { ok: true };
}

export async function updateChampionship(
  id: string,
  input: ChampionshipInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = ChampionshipInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  await prisma.championship.update({
    where: { id },
    data: {
      nome: v.nome,
      temporada: v.temporada,
      formato: v.formato,
      inicio: toDate(v.inicio),
      fim: toDate(v.fim),
      finalsDate: toDate(v.finalsDate),
    },
  });
  revalidatePath(PATH);
  return { ok: true };
}

export async function setChampionshipStatus(
  id: string,
  status: "ATIVA" | "ENCERRADA",
): Promise<ActionResult> {
  await requireAdmin();
  await prisma.championship.update({ where: { id }, data: { status } });
  revalidatePath(PATH);
  revalidatePath("/");
  return { ok: true };
}

/** Gera N rodadas semanais (última com peso 2x) + a FINALS na data do campeonato. */
export async function generateRounds(
  championshipId: string,
  input: GenerateRoundsInput,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = GenerateRoundsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { qtd, inicio } = parsed.data;

  const champ = await prisma.championship.findUnique({ where: { id: championshipId } });
  if (!champ) return { ok: false, error: "Campeonato não encontrado." };

  const existentes = await prisma.round.count({ where: { championshipId } });
  if (existentes > 0) {
    return { ok: false, error: "Este campeonato já tem rodadas. Apague-as antes de gerar de novo." };
  }

  const rounds: Prisma.RoundCreateManyInput[] = Array.from({ length: qtd }, (_, i) => ({
    championshipId,
    numero: i + 1,
    data: addDays(inicio, 7 * i),
    peso: i === qtd - 1 ? 2 : 1, // última etapa vale em dobro
  }));
  rounds.push({
    championshipId,
    numero: null,
    data: champ.finalsDate,
    peso: 1,
    isFinals: true,
    status: "AGENDADA",
  });

  await prisma.round.createMany({ data: rounds });
  revalidatePath(PATH);
  revalidatePath("/sorteio");
  return { ok: true };
}
