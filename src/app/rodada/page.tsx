import Link from "next/link";
import { requirePlayer } from "@/lib/auth-guard";
import { getPlayerRound } from "@/server/player.service";
import { PlayerShell, PlayerIcon } from "@/components/player/PlayerShell";
import { MatchCard, GroupStandingsCard, StatusChip, Avatar } from "@/components/player/ui";
import { LiveRefresher } from "@/components/player/LiveRefresher";

export const dynamic = "force-dynamic";

const brData = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });

export default async function RodadaPage() {
  const { playerId } = await requirePlayer();
  const r = await getPlayerRound(playerId);

  if (!r.round) {
    return (
      <PlayerShell>
        <div className="pt-3">
          <Link href="/inicio" className="mb-3 inline-flex h-[38px] w-[38px] items-center justify-center rounded-[14px] border border-line bg-card text-ink">
            <PlayerIcon size={18}><path d="M15 5l-7 7 7 7" /></PlayerIcon>
          </Link>
          <div className="rounded-[26px] border border-dashed border-white/15 bg-white/[.02] px-5 py-10 text-center">
            <p className="text-[16px] font-extrabold text-ink">Ainda sem rodada</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              Assim que a organização sortear as duplas, seus jogos, grupo e classificação aparecem aqui.
            </p>
          </div>
        </div>
      </PlayerShell>
    );
  }

  const jogosGrupo = r.jogos.filter((j) => j.meta.startsWith("Grupo")).length;

  return (
    <PlayerShell>
      {r.round.status === "SORTEADA" && <LiveRefresher seconds={25} />}
      <div className="pt-3">
        <header className="mb-3 flex items-center gap-3">
          <Link href="/inicio" className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[14px] border border-line bg-card text-ink">
            <PlayerIcon size={18}><path d="M15 5l-7 7 7 7" /></PlayerIcon>
          </Link>
          <div className="flex-1">
            <p className="text-[18px] font-extrabold text-ink">Rodada {r.round.numero}</p>
            <p className="text-[11.5px] text-muted">
              {brData(r.round.data)} · {r.round.numGrupos} {r.round.numGrupos === 1 ? "grupo" : "grupos"}
            </p>
          </div>
          <StatusChip status={r.round.status as "ABERTA" | "SORTEADA" | "ENCERRADA" | "AGENDADA"} />
        </header>

        <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-ocean/15 bg-ocean/[.09] px-3.5 py-3">
          <span className="text-ocean">
            <PlayerIcon size={17}><path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z" /></PlayerIcon>
          </span>
          <p className="text-[11.5px] leading-snug text-ink">
            Placares lançados pela organização. Você acompanha em tempo real.
          </p>
        </div>

        {r.myTeam && (
          <div className="mb-4 rounded-[24px] border border-accent/30 bg-[linear-gradient(150deg,rgba(255,122,26,.12),#123239_60%)] p-4">
            <p className="text-[10px] font-extrabold tracking-[.1em] text-accent">
              SUA DUPLA{r.myTeam.grupo ? ` · GRUPO ${r.myTeam.grupo}` : ""}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <Avatar nome={r.myTeam.label} size={40} ring />
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-extrabold text-ink">{r.myTeam.label}</p>
                {jogosGrupo > 0 && <p className="text-[11.5px] text-muted">{jogosGrupo} jogos na fase de grupos</p>}
              </div>
            </div>
          </div>
        )}

        <h2 className="mb-2 text-[13px] font-extrabold text-ink">Seus jogos</h2>
        {r.jogos.length === 0 ? (
          <p className="rounded-2xl border border-line bg-card p-4 text-[12.5px] text-muted">
            As duplas ainda não foram sorteadas.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {r.jogos.map((j, i) => (
              <MatchCard key={i} adversarios={j.adversarios} scoreA={j.scoreA} scoreB={j.scoreB} estado={j.estado} meta={j.meta} />
            ))}
          </div>
        )}

        {r.group && (
          <div className="mt-4">
            <GroupStandingsCard grupo={r.group.grupo} rows={r.group.rows} />
          </div>
        )}

        <div className="mt-4">
          <h2 className="mb-2 text-[13px] font-extrabold text-ink">Mata-mata</h2>
          {r.mataMata.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-white/15 bg-white/[.02] px-4 py-4">
              <span className="rounded-full bg-white/7 px-2.5 py-1 text-[9.5px] font-extrabold text-muted">AGUARDANDO</span>
              <p className="mt-2 text-[11.5px] text-muted">
                Libera quando todos os jogos dos grupos tiverem placar.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {r.mataMata.map((m, i) => (
                <div key={i} className="rounded-[18px] border border-line bg-card px-3.5 py-3">
                  <p className="text-[9.5px] font-extrabold uppercase tracking-[.08em] text-muted">{m.phaseLabel}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">
                      {m.labelA} <span className="text-muted">vs</span> {m.labelB}
                    </p>
                    <p className="font-mono text-[15px] font-black text-ink">
                      {m.scoreA != null && m.scoreB != null ? `${m.scoreA}×${m.scoreB}` : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PlayerShell>
  );
}
