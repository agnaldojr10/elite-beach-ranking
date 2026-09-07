import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlayer } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { getPlayerHome, getPlayerDesempenho } from "@/server/player.service";
import { getAthleteStats } from "@/server/stats.service";
import { PlayerShell, PlayerIcon } from "@/components/player/PlayerShell";
import { AthleteCard } from "@/components/player/AthleteCard";
import { Avatar } from "@/components/player/ui";

export const dynamic = "force-dynamic";

export default async function AtletaPage({ params }: { params: Promise<{ id: string }> }) {
  const { playerId: viewerId } = await requirePlayer();
  const { id } = await params;

  const player = await prisma.player.findUnique({ where: { id }, select: { active: true } });
  if (!player?.active) notFound();

  const [home, d, stats] = await Promise.all([
    getPlayerHome(id),
    getPlayerDesempenho(id),
    getAthleteStats(viewerId, id),
  ]);

  return (
    <PlayerShell>
      <div className="pt-3">
        <header className="mb-4 flex items-center gap-3">
          <Link href="/classificacao" className="flex h-[38px] w-[38px] items-center justify-center rounded-[14px] border border-line bg-card text-ink">
            <PlayerIcon size={18}><path d="M15 5l-7 7 7 7" /></PlayerIcon>
          </Link>
          <h1 className="text-[18px] font-extrabold text-ink">Atleta</h1>
        </header>

        <AthleteCard
          data={{
            nome: home.player.nome,
            clube: home.player.clube,
            posicao: home.me?.posicao ?? null,
            vitorias: d.vitorias,
            saldo: d.saldo,
            gamesPro: d.gamesPro,
            pontos: d.pontos,
            titulos: d.trofeus.titulos,
            podios: d.trofeus.podios,
            photoUrl: home.player.photoUrl,
          }}
        />

        {/* nível ELO + forma */}
        {stats && (
          <div className="mt-4 rounded-[18px] border border-line bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9.5px] tracking-[.1em] text-muted">NÍVEL</p>
                <p className="mt-0.5 text-[17px] font-black text-accent">{stats.nivel}</p>
                <p className="mt-0.5 text-[10.5px] text-muted">
                  #{stats.ratingRank} de {stats.totalRated} no rating
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9.5px] tracking-[.1em] text-muted">RATING</p>
                <p className="mt-0.5 text-[26px] font-black leading-none text-ink">{stats.rating}</p>
              </div>
            </div>
            {stats.forma.length > 0 && (
              <div className="mt-3.5 border-t border-line pt-3">
                <p className="mb-1.5 text-[9.5px] tracking-[.1em] text-muted">FORMA (ÚLTIMOS JOGOS)</p>
                <div className="flex gap-1.5">
                  {stats.forma.map((f, i) => (
                    <span
                      key={i}
                      className={`flex h-[26px] w-[26px] items-center justify-center rounded-[9px] text-[12px] font-black ${
                        f === "V" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                      }`}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* confronto direto (você x este atleta) */}
        {stats?.h2h && (
          <div className="mt-4 rounded-[18px] border border-accent/30 bg-accent/5 p-4">
            <p className="text-[9.5px] tracking-[.1em] text-accent">CONFRONTO DIRETO · VOCÊ</p>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-center">
                <p className="text-[26px] font-black leading-none text-ink">{stats.h2h.winsMe}</p>
                <p className="mt-1 text-[10px] font-semibold text-muted">Você</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] font-bold text-muted">{stats.h2h.jogos} {stats.h2h.jogos === 1 ? "jogo" : "jogos"}</p>
                <p className="mt-0.5 text-[10px] text-muted">{stats.h2h.gamesMe}–{stats.h2h.gamesThem} games</p>
              </div>
              <div className="text-center">
                <p className="text-[26px] font-black leading-none text-ink">{stats.h2h.winsThem}</p>
                <p className="mt-1 text-[10px] font-semibold text-muted">{stats.h2h.nome}</p>
              </div>
            </div>
          </div>
        )}

        {/* resumo */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-[18px] border border-line bg-card p-3.5">
            <p className="text-[9.5px] tracking-[.1em] text-muted">APROVEITAMENTO</p>
            <p className="mt-1 text-[22px] font-black text-ink">{d.aproveitamento}%</p>
            <p className="mt-0.5 text-[10.5px] text-muted">{d.vitorias} de {d.jogos} jogos</p>
          </div>
          <div className="rounded-[18px] border border-line bg-card p-3.5">
            <p className="text-[9.5px] tracking-[.1em] text-muted">MELHOR RESULTADO</p>
            <p className="mt-1 text-[18px] font-black text-gold">{d.melhorTierLabel ?? "—"}</p>
          </div>
        </div>

        {/* conquistas */}
        {stats && stats.conquistas.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[9.5px] tracking-[.1em] text-muted">CONQUISTAS</p>
            <div className="flex flex-wrap gap-2">
              {stats.conquistas.map((c, i) => (
                <div key={i} className="flex items-center gap-2 rounded-[14px] border border-line bg-card px-3 py-2">
                  <span className="text-[18px]">{c.icon}</span>
                  <div>
                    <p className="text-[11.5px] font-extrabold text-ink">{c.label}</p>
                    <p className="text-[9.5px] text-muted">{c.hint}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* rivais: freguês & algoz */}
        {stats && (stats.fregues || stats.algoz) && (
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {stats.fregues && (
              <div className="rounded-[18px] border border-line bg-card p-3.5">
                <p className="text-[9.5px] tracking-[.1em] text-success">FREGUÊS</p>
                <p className="mt-1 truncate text-[15px] font-black text-ink">{stats.fregues.nome}</p>
                <p className="mt-0.5 text-[10.5px] text-muted">
                  {stats.fregues.vitorias} {stats.fregues.vitorias === 1 ? "vitória" : "vitórias"} em {stats.fregues.jogos}
                </p>
              </div>
            )}
            {stats.algoz && (
              <div className="rounded-[18px] border border-line bg-card p-3.5">
                <p className="text-[9.5px] tracking-[.1em] text-danger">ALGOZ</p>
                <p className="mt-1 truncate text-[15px] font-black text-ink">{stats.algoz.nome}</p>
                <p className="mt-0.5 text-[10.5px] text-muted">
                  {stats.algoz.derrotas} {stats.algoz.derrotas === 1 ? "derrota" : "derrotas"} em {stats.algoz.jogos}
                </p>
              </div>
            )}
          </div>
        )}

        {/* química de dupla */}
        {stats && stats.parceiros.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[9.5px] tracking-[.1em] text-muted">QUÍMICA DE DUPLA</p>
            <div className="flex flex-col gap-2">
              {stats.parceiros.map((p, i) => (
                <div key={i} className="flex items-center gap-3 rounded-[18px] border border-line bg-card px-3.5 py-2.5">
                  <Avatar nome={p.nome} size={28} />
                  <span className="flex-1 truncate text-[11.5px] font-semibold text-ink">{p.nome}</span>
                  <span className="text-[10.5px] text-muted">{p.vitorias}/{p.jogos}</span>
                  <span
                    className={`w-[42px] text-right text-[12.5px] font-black ${
                      p.winPct >= 50 ? "text-success" : "text-muted"
                    }`}
                  >
                    {p.winPct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {d.historico.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[9.5px] tracking-[.1em] text-muted">HISTÓRICO POR RODADA</p>
            <div className="flex flex-col gap-2">
              {d.historico.map((h, i) => (
                <div key={i} className="flex items-center gap-3 rounded-[18px] border border-line bg-card px-3.5 py-3">
                  <span className="w-[62px] text-[12.5px] font-extrabold text-ink">Rodada {h.numero}</span>
                  <span className="flex-1 truncate text-[11.5px] text-muted">{h.tierLabel}</span>
                  <span className={`text-[13px] font-extrabold ${h.pts > 10 ? "text-success" : "text-ink"}`}>+{h.pts}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PlayerShell>
  );
}
