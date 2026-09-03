import Link from "next/link";
import { requirePlayer } from "@/lib/auth-guard";
import { getPlayerRound } from "@/server/player.service";
import { PlayerIcon } from "@/components/player/PlayerShell";
import { Avatar, Chip, LiveDot } from "@/components/player/ui";
import { LiveRefresher } from "@/components/player/LiveRefresher";

export const dynamic = "force-dynamic";

export default async function JogoAgoraPage() {
  const { playerId } = await requirePlayer();
  const r = await getPlayerRound(playerId);

  const atual = r.jogos.find((j) => j.estado === "em_quadra");
  const proximos = r.jogos.filter((j) => j.estado === "agendado");

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-base px-5 pb-12 text-ink">
      <LiveRefresher seconds={20} />

      {/* glow topo */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-52 bg-[radial-gradient(60%_100%_at_50%_0,rgba(255,122,26,.20),transparent)]" />

      <header className="relative flex items-center gap-3 pt-6">
        <Link href="/inicio" className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[14px] border border-line bg-card text-ink">
          <PlayerIcon size={18}><path d="M15 5l-7 7 7 7" /></PlayerIcon>
        </Link>
        {atual ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-danger/40 bg-danger/[.16] px-3 py-1.5">
            <LiveDot />
            <span className="text-[11px] font-extrabold tracking-[.14em] text-danger">AO VIVO</span>
          </span>
        ) : (
          <span className="text-[13px] font-extrabold text-ink">Meu jogo</span>
        )}
        <span className="flex-1" />
        <span className="text-[11px] font-semibold text-muted">atualiza sozinho</span>
      </header>

      {r.round && (
        <div className="relative mt-4 flex gap-1.5">
          <Chip>Rodada {r.round.numero}</Chip>
          {r.myTeam?.grupo && <Chip tone="ocean">Grupo {r.myTeam.grupo}</Chip>}
        </div>
      )}

      {atual ? (
        <>
          <div className="relative mt-4 rounded-[28px] border border-accent/35 bg-card p-5">
            {/* sua dupla */}
            <div className="flex items-center gap-3">
              <Avatar nome={r.myTeam?.label ?? "Você"} size={44} ring />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-extrabold text-ink">{r.myTeam?.label}</p>
                <p className="text-[10px] font-extrabold tracking-[.06em] text-accent">SUA DUPLA</p>
              </div>
              <p className="font-mono text-[40px] font-black leading-none text-ink">
                {atual.scoreA ?? "—"}
              </p>
            </div>

            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="text-[10px] font-extrabold tracking-[.16em] text-muted">VS</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            {/* adversários */}
            <div className="flex items-center gap-3">
              <Avatar nome={atual.adversarios} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-extrabold text-ink">{atual.adversarios}</p>
                <p className="text-[10px] font-semibold text-muted">{atual.meta}</p>
              </div>
              <p className="font-mono text-[40px] font-black leading-none text-muted">
                {atual.scoreB ?? "—"}
              </p>
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-muted">
              Set único · vence com 6 games e 2 de vantagem · 7×5 e 7×6 (tiebreak)
            </p>
          </div>

          {proximos.length > 0 && (
            <>
              <div className="mt-6 flex items-baseline justify-between">
                <h2 className="text-[15px] font-extrabold text-ink">Seus próximos jogos</h2>
                {r.myTeam?.grupo && <span className="text-[11px] text-muted">Grupo {r.myTeam.grupo}</span>}
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {proximos.map((j, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-[18px] border border-line bg-card px-3.5 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[.05] text-[11px] font-extrabold text-muted">
                      {i + 1}º
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-bold text-ink">vs {j.adversarios}</p>
                      <p className="text-[10.5px] text-muted">{j.meta}</p>
                    </div>
                    <span className="rounded-full bg-white/7 px-2.5 py-1 text-[9.5px] font-extrabold text-muted">Agendado</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="relative mt-6 rounded-[26px] border border-dashed border-white/15 bg-white/[.02] px-5 py-10 text-center">
          <p className="text-[16px] font-extrabold text-ink">Nenhum jogo agora</p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            Quando a rodada estiver rolando, seu jogo atual aparece aqui em tempo real.
          </p>
        </div>
      )}

      <Link
        href="/rodada"
        className="relative mt-6 block rounded-full border border-line py-3.5 text-center text-[14px] font-extrabold text-ink"
      >
        Ver minha rodada completa
      </Link>
    </main>
  );
}
