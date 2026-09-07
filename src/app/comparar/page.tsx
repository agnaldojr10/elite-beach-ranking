import Link from "next/link";
import { requirePlayer } from "@/lib/auth-guard";
import { getPlayerOptions, compareAthletes, type CompareSide } from "@/server/stats.service";
import { PlayerShell, PlayerIcon } from "@/components/player/PlayerShell";
import { Avatar } from "@/components/player/ui";
import { CompareSelector } from "@/components/player/CompareSelector";

export const dynamic = "force-dynamic";

const primeiro = (n: string) => n.split(" ")[0];

/** Linha comparativa: destaca quem tem o melhor valor. */
function Row({
  label,
  a,
  b,
  fmt = (v) => String(v),
  higher = true,
}: {
  label: string;
  a: number;
  b: number;
  fmt?: (v: number) => string;
  higher?: boolean;
}) {
  const aWins = higher ? a > b : a < b;
  const bWins = higher ? b > a : b < a;
  const win = "text-accent";
  const lose = "text-ink";
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-line py-2.5 last:border-0">
      <span className={`text-right text-[15px] font-black ${aWins ? win : lose}`}>{fmt(a)}</span>
      <span className="text-[9px] tracking-[.08em] text-muted">{label}</span>
      <span className={`text-left text-[15px] font-black ${bWins ? win : lose}`}>{fmt(b)}</span>
    </div>
  );
}

function Head({ side }: { side: CompareSide }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Avatar nome={side.nome} foto={side.photoUrl} size={54} />
      <p className="max-w-[110px] truncate text-center text-[12.5px] font-extrabold text-ink">{primeiro(side.nome)}</p>
      <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[9.5px] font-bold text-accent">{side.nivel}</span>
    </div>
  );
}

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { playerId } = await requirePlayer();
  const { a, b } = await searchParams;
  const options = await getPlayerOptions();

  const aId = a ?? playerId;
  const bId = b ?? "";
  const cmp = aId && bId ? await compareAthletes(aId, bId) : null;

  return (
    <PlayerShell>
      <div className="pt-3">
        <header className="mb-4 flex items-center gap-3">
          <Link
            href="/classificacao"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-[14px] border border-line bg-card text-ink"
          >
            <PlayerIcon size={18}><path d="M15 5l-7 7 7 7" /></PlayerIcon>
          </Link>
          <h1 className="text-[18px] font-extrabold text-ink">Comparar atletas</h1>
        </header>

        <CompareSelector options={options} a={aId} b={bId} />

        {!cmp && (
          <p className="mt-6 rounded-[18px] border border-line bg-card p-4 text-center text-[12px] text-muted">
            Escolha dois atletas para ver o comparativo lado a lado.
          </p>
        )}

        {cmp && (
          <div className="mt-5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <Head side={cmp.a} />
              <span className="text-[13px] font-black text-muted">×</span>
              <Head side={cmp.b} />
            </div>

            <div className="mt-4 rounded-[20px] border border-line bg-card px-4 py-1.5">
              <Row label="RATING" a={cmp.a.rating} b={cmp.b.rating} />
              <Row label="VITÓRIAS" a={cmp.a.vitorias} b={cmp.b.vitorias} />
              <Row label="APROVEITAMENTO" a={cmp.a.winPct} b={cmp.b.winPct} fmt={(v) => `${v}%`} />
              <Row label="SALDO DE GAMES" a={cmp.a.saldo} b={cmp.b.saldo} fmt={(v) => `${v >= 0 ? "+" : ""}${v}`} />
              <Row label="GAMES A FAVOR" a={cmp.a.gamesPro} b={cmp.b.gamesPro} />
              <Row label="MAIOR SEQUÊNCIA" a={cmp.a.maxStreak} b={cmp.b.maxStreak} />
              <Row label="TÍTULOS" a={cmp.a.titulos} b={cmp.b.titulos} />
            </div>

            {cmp.h2h ? (
              <div className="mt-4 rounded-[20px] border border-accent/30 bg-accent/5 p-4">
                <p className="text-center text-[9.5px] tracking-[.1em] text-accent">CONFRONTO DIRETO</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-[28px] font-black leading-none text-ink">{cmp.h2h.winsA}</p>
                    <p className="mt-1 text-[10px] text-muted">{primeiro(cmp.a.nome)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-bold text-muted">
                      {cmp.h2h.jogos} {cmp.h2h.jogos === 1 ? "jogo" : "jogos"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted">
                      {cmp.h2h.gamesA}–{cmp.h2h.gamesB} games
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[28px] font-black leading-none text-ink">{cmp.h2h.winsB}</p>
                    <p className="mt-1 text-[10px] text-muted">{primeiro(cmp.b.nome)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-center text-[11px] text-muted">Estes dois ainda não se enfrentaram.</p>
            )}
          </div>
        )}
      </div>
    </PlayerShell>
  );
}
