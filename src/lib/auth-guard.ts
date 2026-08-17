import { auth } from "@/auth";

/** Garante que há um admin logado (usar no início de toda Server Action). */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");
  return session;
}
