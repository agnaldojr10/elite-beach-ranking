import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { getActiveChampionshipOrSelect } from "@/lib/active-champ";

export const dynamic = "force-dynamic";

const CARDS = [
  {
    href: "/ranking",
    title: "Ranking",
    desc: "Classificação geral e por rodada",
    icon: <path d="M8 4h8v4a4 4 0 0 1-8 0V4zM9 16h6M12 12v4M8 20h8M6 5H4v2a3 3 0 0 0 3 3M18 5h2v2a3 3 0 0 1-3 3" />,
  },
  {
    href: "/sorteio",
    title: "Sorteio",
    desc: "Rodadas e duplas",
    icon: <path d="M4 7h3l7 10h4M4 17h3l2.4-3.4M14 7h4M17 4l3 3-3 3M17 14l3 3-3 3" />,
  },
  {
    href: "/torneios",
    title: "Torneios",
    desc: "Super 8/12/16 (Americano)",
    icon: <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.6L4 16M4 20v-4h4" />,
  },
  {
    href: "/cadastros/jogadores",
    title: "Cadastros",
    desc: "Jogadores e campeonatos",
    icon: <path d="M9 8a3.2 3.2 0 1 0 0-.01M3.5 20a5.6 5.6 0 0 1 11 0M17.5 9.2a2.4 2.4 0 1 0 0-.01M15.3 20a4.6 4.6 0 0 1 6.2-4.3" />,
  },
  {
    href: "/configuracoes",
    title: "Configurações",
    desc: "Pontuação, admins e preferências",
    icon: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />,
  },
];

const STATUS_LABEL: Record<string, string> = {
  ABERTA: "Aberta",
  SORTEADA: "Sorteada",
  ENCERRADA: "Encerrada",
  AGENDADA: "Especial",
};
const brDate = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });

export default async function HomePage() {
  const session = await auth();
  const nome = session?.user?.name ?? "Admin";

  const champ = await getActiveChampionshipOrSelect();
  const rodadaAtual = champ
    ? await prisma.round.findFirst({
        where: { championshipId: champ.id, isFinals: false, status: { not: "ENCERRADA" } },
        orderBy: { numero: "asc" },
        select: { id: true, numero: true, data: true, status: true },
      })
    : null;

  return (
    <AppShell>
      <header className="mb-5">
        <p className="text-2xl font-bold text-ink">Olá, {nome}</p>
        {champ ? (
          <Link
            href="/campeonatos"
            className="mt-2 inline-flex items-center gap-2 rounded-full border border-line bg-accent/10 px-3 py-1.5 text-xs font-semibold text-ink"
          >
            <span className="h-2 w-2 rounded-full bg-accent" />
            {champ.nome}
            <span className="text-accent">⇄</span>
          </Link>
        ) : (
          <Link href="/cadastros/campeonatos" className="mt-1 inline-block text-sm text-ocean">
            Nenhum campeonato ativo — criar
          </Link>
        )}
      </header>

      {rodadaAtual && (
        <Link
          href={`/sorteio/${rodadaAtual.id}`}
          className="mb-4 flex items-center gap-3 rounded-2xl border border-accent bg-accent/10 p-4"
        >
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-accent">Rodada em andamento</p>
            <p className="text-sm font-bold text-ink">
              Rodada {rodadaAtual.numero} · {brDate(rodadaAtual.data)}
            </p>
            <p className="text-xs text-muted">{STATUS_LABEL[rodadaAtual.status] ?? rodadaAtual.status}</p>
          </div>
          <span className="text-accent">›</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex min-h-[140px] flex-col justify-between rounded-3xl border border-line bg-card p-5"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {c.icon}
              </svg>
            </span>
            <span className="mt-3 block">
              <span className="block text-base font-bold text-ink">{c.title}</span>
              <span className="block text-xs leading-snug text-muted">{c.desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
