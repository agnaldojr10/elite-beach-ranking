import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { requireAdmin } from "@/lib/auth-guard";

// Deriva do requireAdmin (evita a sobrecarga de middleware do `auth`).
type Session = Awaited<ReturnType<typeof requireAdmin>> | null;

export type ActivityAction =
  | "SORTEAR"
  | "RESORTEAR"
  | "TROCAR_PARCEIRO"
  | "CONFIRMAR_DUPLAS"
  | "SALVAR_PLACAR"
  | "MATA_MATA"
  | "ENCERRAR"
  | "REABRIR"
  | "PESO";

/**
 * Registra uma ação sensível do admin (auditoria). Best-effort: nunca derruba a
 * ação principal se o log falhar. O nome/email do autor é denormalizado.
 */
export async function logActivity(
  action: ActivityAction,
  opts: {
    session?: Session;
    roundId?: string;
    roundNumero?: number | null;
    championshipId?: string | null;
    detail?: unknown;
  } = {},
): Promise<void> {
  try {
    const session = opts.session ?? ((await auth()) as Session);
    const u = session?.user as { id?: string; name?: string | null; email?: string | null } | undefined;
    const actorId = u?.id ?? null;
    let actorName = u?.name ?? u?.email ?? "admin";
    let actorEmail = u?.email ?? null;
    if (actorId) {
      const a = await prisma.admin.findUnique({ where: { id: actorId }, select: { nome: true, email: true } });
      if (a) {
        actorName = a.nome;
        actorEmail = a.email;
      }
    }
    await prisma.activityLog.create({
      data: {
        action,
        actorId,
        actorName,
        actorEmail,
        roundId: opts.roundId ?? null,
        roundNumero: opts.roundNumero ?? null,
        championshipId: opts.championshipId ?? null,
        detail: (opts.detail as object) ?? undefined,
      },
    });
  } catch {
    /* auditoria é best-effort */
  }
}

export type ActivityEntry = {
  id: string;
  createdAt: Date;
  actorName: string;
  actorEmail: string | null;
  action: string;
  roundId: string | null;
  roundNumero: number | null;
  detail: unknown;
};

/** Lê o log de auditoria (mais recentes primeiro), opcionalmente por rodada. */
export async function getActivityLog(opts: { roundId?: string; limit?: number } = {}): Promise<ActivityEntry[]> {
  const rows = await prisma.activityLog.findMany({
    where: opts.roundId ? { roundId: opts.roundId } : {},
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 300,
    select: {
      id: true,
      createdAt: true,
      actorName: true,
      actorEmail: true,
      action: true,
      roundId: true,
      roundNumero: true,
      detail: true,
    },
  });
  return rows as ActivityEntry[];
}
