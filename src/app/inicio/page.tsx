import Link from "next/link";
import { requirePlayer } from "@/lib/auth-guard";
import { getPlayerHome } from "@/server/player.service";
import { PlayerShell, PlayerIcon } from "@/components/player/PlayerShell";
import { PlayerCard, LiveMatchCard, StatusChip } from "@/components/player/ui";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

const primeiro = (nome: string) => nome.trim().split(/\s+/)[0];
const brData = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });

const ATALHOS = [
  { href: "/classificacao", label: "Ranking", tone: "text-accent", icon: <path d="M8 4h8v4a4 4 0 0 1-8 0V4zM9 16h6M12 12v4M8 20h8" /> },
  { href: "/desempenho", label: "Desempenho", tone: "text-ocean", icon: <path d="M4 19V5M4 19h16M8 16v-4M13 16V9M18 16v-6" /> },
  { href: "/rodada", label: "Confrontos", tone: "text-success", icon: <path d="M4 7h3l7 10h4M4 17h3l2.4-3.4M14 7h4M17 4l3 3-3 3M17 14l3 3-3 3" /> },
];

export default async function InicioPage() {
  const { playerId } = await requirePlayer();
  const home = await getPlayerHome(playerId);

  return (
    <PlayerShell>
      <header className="mb-4 flex items-start gap-3 pt-3">
        <div className="flex-1">
          <p className="text-[19px] font-extrabold text-ink">Olá, {primeiro(home.player.nome)}</p>
          {home.championship && (
            <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-line bg-accent/10 px-3 py-1.5 text-[11.5px] font-semibold text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {home.championship.nome}
            </span>
          )}
        </div>
        <ThemeToggle />
      </header>

      <div className="flex flex-col gap-3.5">
        <PlayerCard
          nome={home.player.nome}
          clube={home.player.clube}
          foto={home.player.photoUrl}
          posicao={home.me?.posicao ?? null}
          variacao={home.me?.variacao ?? "same"}
          pontos={home.me?.pontos ?? 0}
          rodadas={home.rodadasJogadas}
          vitorias={home.vitorias}
        />

        {home.live && (
          <LiveMatchCard
            minhaDupla={home.live.minhaDupla}
            adversarios={home.live.adversarios}
            rodada={home.live.rodada}
            grupo={home.live.grupo}
            href="/jogo-agora"
          />
        )}

        {home.proxima && (
          <Link href="/rodada" className="flex items-center gap-3 rounded-[22px] border border-line bg-card p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/[.14] text-warning">
              <PlayerIcon size={20}>
                <path d="M4 7h16v13H4zM4 10h16M8 3v4M16 3v4" />
              </PlayerIcon>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9.5px] tracking-[.1em] text-muted">PRÓXIMA RODADA</p>
              <p className="truncate text-[14px] font-extrabold text-ink">
                Rodada {home.proxima.numero} · {brData(home.proxima.data)}
              </p>
            </div>
            <StatusChip status={home.proxima.status as "ABERTA" | "SORTEADA" | "ENCERRADA" | "AGENDADA"} />
          </Link>
        )}

        <div className="flex gap-2.5">
          {ATALHOS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-1 flex-col gap-2 rounded-[20px] border border-line bg-card px-3 py-3.5"
            >
              <span className={a.tone}>
                <PlayerIcon size={20}>{a.icon}</PlayerIcon>
              </span>
              <span className="text-[11.5px] font-bold text-ink">{a.label}</span>
            </Link>
          ))}
        </div>

        <Link href="/card" className="flex items-center gap-3 rounded-[20px] border border-line bg-card px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] tracking-[.1em] text-muted">TROFÉUS</p>
            <p className="mt-1 text-[13px] text-muted">
              <span className="font-extrabold text-gold">{home.trofeus.titulos}</span> título
              {home.trofeus.titulos === 1 ? "" : "s"} ·{" "}
              <span className="font-extrabold text-silver">{home.trofeus.podios}</span> pódios ·{" "}
              <span className="font-extrabold text-bronze">{home.trofeus.pneu}</span> pneu
            </p>
          </div>
          <span className="text-muted">
            <PlayerIcon size={18}>
              <path d="M9 5l7 7-7 7" />
            </PlayerIcon>
          </span>
        </Link>

        {!home.championship && (
          <p className="rounded-2xl border border-line bg-card p-4 text-center text-[12.5px] text-muted">
            Nenhum campeonato ativo no momento.
          </p>
        )}
      </div>
    </PlayerShell>
  );
}
