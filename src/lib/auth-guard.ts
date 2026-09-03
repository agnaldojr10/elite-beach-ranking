import { auth } from "@/auth";

/**
 * Garante ADMIN logado (usar no início de TODA Server Action de escrita).
 * Sessões antigas (sem papel) contam como ADMIN; atletas (role PLAYER) são
 * bloqueados — o jogador nunca grava resultado/sorteio.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");
  if (session.user.role === "PLAYER") throw new Error("Sem permissão.");
  return session;
}

/** Garante um atleta (PLAYER) logado; devolve o playerId. */
export async function requirePlayer() {
  const session = await auth();
  const playerId = session?.user?.playerId;
  if (!session?.user || session.user.role !== "PLAYER" || !playerId) {
    throw new Error("Acesso restrito ao atleta.");
  }
  return { session, playerId };
}
