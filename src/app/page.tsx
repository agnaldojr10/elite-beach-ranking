import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { getActiveChampionshipOrSelect } from "@/lib/active-champ";

export const dynamic = "force-dynamic";

const CARDS = [
  { href: "/ranking", title: "Ranking", desc: "Classificação geral e por rodada" },
  { href: "/sorteio", title: "Sorteio", desc: "Rodadas e duplas" },
  { href: "/cadastros/jogadores", title: "Cadastros", desc: "Jogadores e campeonatos" },
  { href: "/configuracoes", title: "Configurações", desc: "Pontuação, admins e preferências" },
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
