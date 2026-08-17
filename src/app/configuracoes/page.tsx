import { signOut } from "@/auth";
import { AppShell } from "@/components/AppShell";

export default function ConfiguracoesPage() {
  return (
    <AppShell title="Configurações">
      <p className="mb-6 text-sm text-muted">Mais opções em breve.</p>
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
