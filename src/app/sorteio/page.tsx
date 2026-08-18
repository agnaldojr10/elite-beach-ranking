import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  ABERTA: { label: "Aberta", cls: "bg-ocean/15 text-ocean" },
  SORTEADA: { label: "Sorteada", cls: "bg-warning/15 text-warning" },
  ENCERRADA: { label: "Encerrada", cls: "bg-success/15 text-success" },
  AGENDADA: { label: "Especial", cls: "bg-accent/15 text-accent" },
};

const brDate = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });

export default async function SorteioPage() {
  const champ = await prisma.championship.findFirst({ where: { status: "ATIVA" } });

  if (!champ) {
    return (
      <AppShell title="Sorteio">
        <p className="py-10 text-center text-sm text-muted">
          Nenhum campeonato ativo. Crie e ative um em Cadastros › Campeonatos.
        </p>
      </AppShell>
    );
  }

  const rounds = await prisma.round.findMany({
    where: { championshipId: champ.id },
    orderBy: [{ isFinals: "asc" }, { numero: "asc" }],
    select: { id: true, numero: true, data: true, status: true, peso: true, isFinals: true },
  });

  return (
    <AppShell title="Sorteio">
      <Link
        href="/cadastros/campeonatos"
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-accent/10 px-3 py-1.5 text-xs font-semibold text-ink"
      >
        <span className="h-2 w-2 rounded-full bg-accent" />
        {champ.nome}
        <span className="text-accent">›</span>
      </Link>

      {rounds.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          Nenhuma rodada ainda. Gere as rodadas em Cadastros › Campeonatos.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rounds.map((r) => {
            const st = STATUS[r.status] ?? STATUS.ABERTA;
            return (
              <li key={r.id}>
                <Link
                  href={`/sorteio/${r.id}`}
                  className={`flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 ${
                    r.isFinals ? "border-accent" : "border-line"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${
                      r.isFinals ? "bg-accent/15 text-accent" : "bg-ocean/15 text-ocean"
                    }`}
                  >
                    {r.isFinals ? "★" : r.numero}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-ink">
                      {r.isFinals ? "FINALS" : `Rodada ${r.numero}`}
                    </span>
                    <span className="block text-xs text-muted">{brDate(r.data)}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${st.cls}`}>
                      {st.label}
                    </span>
                    {r.peso === 2 && (
                      <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-[10px] font-bold text-warning">
                        Peso 2x
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
