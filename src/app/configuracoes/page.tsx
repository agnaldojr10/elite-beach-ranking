import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { ScoringForm } from "@/components/ScoringForm";
import { AdminsManager } from "@/components/AdminsManager";
import { ChangePassword } from "@/components/ChangePassword";
import { getActiveChampionshipOrSelect } from "@/lib/active-champ";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const selecionado = await getActiveChampionshipOrSelect();
  const [champ, admins] = await Promise.all([
    selecionado
      ? prisma.championship.findUnique({
          where: { id: selecionado.id },
          select: {
            id: true,
            nome: true,
            ptsParticipacao: true,
            ptsQuartas: true,
            pts4: true,
            pts3: true,
            ptsVice: true,
            ptsCampeao: true,
          },
        })
      : Promise.resolve(null),
    prisma.admin.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, nome: true, email: true, isOwner: true },
    }),
  ]);

  return (
    <AppShell title="Configurações">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
        Regras de pontuação
      </h2>
      {champ ? (
        <>
          <p className="mb-2 text-xs text-muted">{champ.nome}</p>
          <ScoringForm
            championshipId={champ.id}
            initial={{
              ptsParticipacao: champ.ptsParticipacao,
              ptsQuartas: champ.ptsQuartas,
              pts4: champ.pts4,
              pts3: champ.pts3,
              ptsVice: champ.ptsVice,
              ptsCampeao: champ.ptsCampeao,
            }}
          />
        </>
      ) : (
        <p className="rounded-2xl border border-line bg-card p-4 text-sm text-muted">
          Ative um campeonato para editar a pontuação.
        </p>
      )}

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
