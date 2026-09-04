import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlayer } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { getPlayerHome, getPlayerDesempenho } from "@/server/player.service";
import { PlayerShell, PlayerIcon } from "@/components/player/PlayerShell";
import { AthleteCard } from "@/components/player/AthleteCard";
import { Avatar } from "@/components/player/ui";

export const dynamic = "force-dynamic";

export default async function AtletaPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlayer();
  const { id } = await params;

  const player = await prisma.player.findUnique({ where: { id }, select: { active: true } });
  if (!player?.active) notFound();

  const [home, d] = await Promise.all([getPlayerHome(id), getPlayerDesempenho(id)]);

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

        {d.parceiros.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[9.5px] tracking-[.1em] text-muted">PARCEIROS MAIS FREQUENTES</p>
            <div className="flex flex-col gap-2">
              {d.parceiros.map((p, i) => (
                <div key={i} className="flex items-center gap-3 rounded-[18px] border border-line bg-card px-3.5 py-2.5">
                  <Avatar nome={p.nome} size={28} />
                  <span className="flex-1 truncate text-[11.5px] font-semibold text-ink">{p.nome}</span>
                  <span className="text-[11.5px] font-extrabold text-muted">{p.vezes}×</span>
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
