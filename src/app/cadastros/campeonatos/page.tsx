import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function CampeonatosPage() {
  return (
    <AppShell title="Cadastros">
      <div className="mb-3 flex gap-2">
        <Link
          href="/cadastros/jogadores"
          className="flex-1 rounded-xl border border-line bg-card py-2.5 text-center text-sm font-semibold text-muted"
        >
          Jogadores
        </Link>
        <span className="flex-1 rounded-xl bg-accent py-2.5 text-center text-sm font-bold text-accent-ink">
          Campeonatos
        </span>
      </div>
      <p className="py-10 text-center text-sm text-muted">Em breve.</p>
    </AppShell>
  );
}
