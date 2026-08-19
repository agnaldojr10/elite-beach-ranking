import Link from "next/link";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { AdminsManager } from "@/components/AdminsManager";
import { ChangePassword } from "@/components/ChangePassword";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, nome: true, email: true, isOwner: true },
  });

  return (
    <AppShell title="Configurações">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
        Regras de pontuação
      </h2>
      <Link
        href="/cadastros/campeonatos"
        className="mb-2 block rounded-2xl border border-line bg-card p-4 text-sm text-muted"
      >
        A pontuação agora é configurada em cada campeonato (Cadastros › Campeonatos › Editar),
        pois pode variar de um para outro. Toque para abrir.
      </Link>

      <h2 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-muted">
        Administradores
      </h2>
      <AdminsManager admins={admins} />

      <h2 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wide text-muted">Conta</h2>
      <ChangePassword />
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button className="w-full rounded-xl bg-danger/15 py-3 text-sm font-bold text-danger">
          Sair
        </button>
      </form>
    </AppShell>
  );
}
