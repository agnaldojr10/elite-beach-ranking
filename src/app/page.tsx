import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";

const CARDS = [
  { href: "/ranking", title: "Ranking", desc: "Classificação geral e por rodada" },
  { href: "/sorteio", title: "Sorteio", desc: "Rodadas e duplas" },
  { href: "/cadastros/jogadores", title: "Cadastros", desc: "Jogadores e campeonatos" },
  { href: "/configuracoes", title: "Configurações", desc: "Pontuação, admins e preferências" },
];

export default async function HomePage() {
  const session = await auth();
  const nome = session?.user?.name ?? "Admin";

  return (
    <AppShell>
      <header className="mb-6 pt-6">
        <p className="text-2xl font-bold text-ink">Olá, {nome}</p>
        <p className="mt-1 text-sm text-muted">Elite Beach Ranking</p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex min-h-[132px] flex-col justify-between rounded-3xl border border-line bg-card p-5"
          >
            <span className="text-base font-bold text-ink">{c.title}</span>
            <span className="text-xs leading-snug text-muted">{c.desc}</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
