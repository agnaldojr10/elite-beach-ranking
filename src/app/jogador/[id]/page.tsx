import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

const TIER_LABEL: Record<string, string> = {
  CAMPEAO: "Campeão",
  VICE: "Vice-campeão",
  TERCEIRO: "3º lugar",
  QUARTO: "4º lugar",
  QUARTAS: "Quartas",
  PARTICIPACAO: "Fase de grupos",
};

const initials = (nome: string) => {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
};

export default async function JogadorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const player = await prisma.player.findUnique({
    where: { id },
    select: { nome: true, type: true },
  });
  if (!player) notFound();

  const results = await prisma.roundResult.findMany({
    where: { playerId: id, round: { isFinals: false } },
    select: {
      tier: true,
      pointsAwarded: true,
      round: { select: { numero: true, championship: { select: { nome: true } } } },
    },
    orderBy: { round: { numero: "asc" } },
  });

  const total = results.reduce((s, r) => s + r.pointsAwarded, 0);

  return (
    <AppShell title="Jogador">
      <Link href="/ranking" className="mb-3 inline-block text-sm text-ocean">
        ‹ Ranking
      </Link>

      <div className="mb-4 flex items-center gap-4 rounded-2xl border border-line bg-card p-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ocean/15 text-lg font-bold text-ocean">
          {initials(player.nome)}
        </span>
        <div>
          <p className="text-lg font-bold text-ink">{player.nome}</p>
          <p className="text-xs text-muted">
            {player.type === "GUEST" ? "Convidado (não pontua)" : "Jogador"} · {total} pts no total
          </p>
        </div>
      </div>

      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Histórico</h2>
      {results.length === 0 ? (
        <p className="rounded-2xl border border-line bg-card p-4 text-sm text-muted">
          Nenhuma rodada encerrada ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {results.map((r, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3"
            >
              <span className="w-16 text-sm font-bold text-ink">Rodada {r.round.numero}</span>
              <span className="flex-1 truncate text-xs text-muted">{TIER_LABEL[r.tier] ?? r.tier}</span>
              <span className="text-sm font-bold text-ink">+{r.pointsAwarded}</span>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
