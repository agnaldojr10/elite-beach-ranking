import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const CHAMP_COOKIE = "ebr_champ";

export type ResolvedChampionship = {
  champ: { id: string; nome: string; temporada: string; status: string } | null;
  needsSelection: boolean;
};

/**
 * Resolve qual campeonato o admin está visualizando:
 * - se o cookie aponta para um campeonato existente, usa ele;
 * - senão, se há exatamente um "em andamento" (ATIVA), usa ele;
 * - se não há nenhum, retorna null;
 * - se há 2+ em andamento e nada escolhido, sinaliza que precisa selecionar.
 */
export async function resolveActiveChampionship(): Promise<ResolvedChampionship> {
  const store = await cookies();
  const id = store.get(CHAMP_COOKIE)?.value;

  if (id) {
    const champ = await prisma.championship.findUnique({
      where: { id },
      select: { id: true, nome: true, temporada: true, status: true },
    });
    if (champ) return { champ, needsSelection: false };
  }

  const ativas = await prisma.championship.findMany({
    where: { status: "ATIVA" },
    orderBy: { createdAt: "desc" },
    select: { id: true, nome: true, temporada: true, status: true },
  });

  if (ativas.length === 1) return { champ: ativas[0], needsSelection: false };
  if (ativas.length === 0) return { champ: null, needsSelection: false };
  return { champ: null, needsSelection: true };
}

/**
 * Para páginas escopadas: devolve o campeonato ativo ou redireciona para a
 * tela de seleção quando há 2+ em andamento e nenhum escolhido. Pode devolver
 * null quando ainda não existe campeonato algum (a página trata o estado vazio).
 */
export async function getActiveChampionshipOrSelect() {
  const { champ, needsSelection } = await resolveActiveChampionship();
  if (needsSelection) redirect("/campeonatos");
  return champ;
}
