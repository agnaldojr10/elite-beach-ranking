import { prisma } from "@/lib/prisma";
import { getRankingGeral, type PneuInfo, type RankingRow } from "@/server/ranking.service";

const primeiro = (nome: string) => nome.trim().split(/\s+/)[0];
const duplaLabel = (a: string, b: string) => `${a} & ${b}`;

/** Campeonato ativo em que o atleta acompanha (v2: o único ATIVA). */
export async function getActiveChampionship() {
  return prisma.championship.findFirst({
    where: { status: "ATIVA" },
    orderBy: { createdAt: "desc" },
    select: { id: true, nome: true, temporada: true },
  });
}

/** Nº de vitórias do atleta (grupos + mata-mata) no campeonato. */
async function contarVitorias(playerId: string, championshipId: string): Promise<number> {
  const teams = await prisma.team.findMany({
    where: { round: { championshipId }, OR: [{ player1Id: playerId }, { player2Id: playerId }] },
    select: { id: true },
  });
  const teamIds = teams.map((t) => t.id);
  if (teamIds.length === 0) return 0;
  const matches = await prisma.match.findMany({
    where: {
      round: { championshipId },
      scoreA: { not: null },
      scoreB: { not: null },
      OR: [{ teamAId: { in: teamIds } }, { teamBId: { in: teamIds } }],
    },
    select: { teamAId: true, teamBId: true, scoreA: true, scoreB: true },
  });
  const mine = new Set(teamIds);
  let wins = 0;
  for (const m of matches) {
    const aMine = mine.has(m.teamAId);
    const bMine = mine.has(m.teamBId);
    if (!aMine && !bMine) continue;
    const aWon = (m.scoreA as number) > (m.scoreB as number);
    if ((aMine && aWon) || (bMine && !aWon)) wins++;
  }
  return wins;
}

export type PlayerLive = {
  roundId: string;
  rodada: number;
  grupo: string | null;
  minhaDupla: string;
  adversarios: string;
} | null;

/** Jogo "acontecendo agora": rodada SORTEADA com jogo pendente do atleta. */
async function getLive(playerId: string, championshipId: string): Promise<PlayerLive> {
  const round = await prisma.round.findFirst({
    where: { championshipId, isFinals: false, status: "SORTEADA" },
    orderBy: { numero: "asc" },
    select: { id: true, numero: true },
  });
  if (!round) return null;

  const teams = await prisma.team.findMany({
    where: { roundId: round.id },
    select: {
      id: true,
      grupo: true,
      player1: { select: { id: true, nome: true } },
      player2: { select: { id: true, nome: true } },
    },
  });
  const myTeam = teams.find((t) => t.player1.id === playerId || t.player2.id === playerId);
  if (!myTeam) return null;
  const label = new Map(teams.map((t) => [t.id, duplaLabel(primeiro(t.player1.nome), primeiro(t.player2.nome))]));

  // próximo jogo do atleta ainda sem placar
  const pend = await prisma.match.findFirst({
    where: {
      roundId: round.id,
      OR: [{ teamAId: myTeam.id }, { teamBId: myTeam.id }],
      scoreA: null,
    },
    orderBy: [{ phase: "asc" }, { slot: "asc" }],
    select: { teamAId: true, teamBId: true },
  });
  if (!pend) return null;
  const advId = pend.teamAId === myTeam.id ? pend.teamBId : pend.teamAId;
  return {
    roundId: round.id,
    rodada: round.numero ?? 0,
    grupo: myTeam.grupo,
    minhaDupla: label.get(myTeam.id) ?? "Você",
    adversarios: label.get(advId) ?? "a definir",
  };
}

export type ProximaRodada = { id: string; numero: number | null; data: string; status: string } | null;

export type PlayerHome = {
  player: { nome: string; clube: string | null; photoUrl: string | null };
  championship: { id: string; nome: string; temporada: string } | null;
  me: RankingRow | null;
  rodadasJogadas: number;
  vitorias: number;
  proxima: ProximaRodada;
  live: PlayerLive;
  trofeus: { titulos: number; podios: number; pneu: number };
};

export async function getPlayerHome(playerId: string): Promise<PlayerHome> {
  const [player, champ] = await Promise.all([
    prisma.player.findUnique({
      where: { id: playerId },
      select: { nome: true, clube: true, photoUrl: true },
    }),
    getActiveChampionship(),
  ]);
  const base = { nome: player?.nome ?? "Atleta", clube: player?.clube ?? null, photoUrl: player?.photoUrl ?? null };

  if (!champ) {
    return {
      player: base,
      championship: null,
      me: null,
      rodadasJogadas: 0,
      vitorias: 0,
      proxima: null,
      live: null,
      trofeus: { titulos: 0, podios: 0, pneu: 0 },
    };
  }

  const [{ rows, pneu }, rodadasJogadas, vitorias, proximaRow, live, tiers] = await Promise.all([
    getRankingGeral(champ.id),
    prisma.roundResult.count({
      where: { playerId, round: { championshipId: champ.id, isFinals: false } },
    }),
    contarVitorias(playerId, champ.id),
    prisma.round.findFirst({
      where: { championshipId: champ.id, isFinals: false, status: { not: "ENCERRADA" } },
      orderBy: { numero: "asc" },
      select: { id: true, numero: true, data: true, status: true },
    }),
    getLive(playerId, champ.id),
    prisma.roundResult.findMany({
      where: { playerId, round: { championshipId: champ.id, isFinals: false } },
      select: { tier: true },
    }),
  ]);

  const me = rows.find((r) => r.playerId === playerId) ?? null;
  const titulos = tiers.filter((t) => t.tier === "CAMPEAO").length;
  const podios = tiers.filter((t) => ["CAMPEAO", "VICE", "TERCEIRO"].includes(t.tier)).length;
  const pneuVezes = pneu?.playerId === playerId ? pneu.vezes : 0;

  return {
    player: base,
    championship: champ,
    me,
    rodadasJogadas,
    vitorias,
    proxima: proximaRow
      ? {
          id: proximaRow.id,
          numero: proximaRow.numero,
          data: proximaRow.data.toISOString(),
          status: proximaRow.status,
        }
      : null,
    live,
    trofeus: { titulos, podios, pneu: pneuVezes },
  };
}

/* ---------------- Ranking (visão do atleta) ---------------- */

const TIER_ORDER: Record<string, number> = {
  CAMPEAO: 0, VICE: 1, TERCEIRO: 2, QUARTO: 3, QUARTAS: 4, PARTICIPACAO: 5,
};
const TIER_LABEL: Record<string, string> = {
  CAMPEAO: "Campeão", VICE: "Vice-campeão", TERCEIRO: "3º lugar",
  QUARTO: "4º lugar", QUARTAS: "Quartas", PARTICIPACAO: "Fase de grupos",
};

export type PlayerRankingData = {
  championship: { nome: string; temporada: string } | null;
  totalRodadas: number;
  rodadasEncerradas: number;
  rows: (RankingRow & { photoUrl: string | null })[];
  pneu: PneuInfo;
  rodadas: { id: string; numero: number; results: { pos: number; nome: string; tierLabel: string; pts: number; isMe: boolean }[] }[];
};

export async function getPlayerRankingData(playerId: string): Promise<PlayerRankingData> {
  const champ = await getActiveChampionship();
  if (!champ) {
    return { championship: null, totalRodadas: 0, rodadasEncerradas: 0, rows: [], pneu: null, rodadas: [] };
  }

  const [{ rows, pneu }, fotos, totalRodadas, rodadasEncerradas, rr] = await Promise.all([
    getRankingGeral(champ.id),
    prisma.player.findMany({ select: { id: true, photoUrl: true } }),
    prisma.round.count({ where: { championshipId: champ.id, isFinals: false } }),
    prisma.round.count({ where: { championshipId: champ.id, isFinals: false, status: "ENCERRADA" } }),
    prisma.roundResult.findMany({
      where: { round: { championshipId: champ.id, isFinals: false } },
      select: {
        tier: true,
        pointsAwarded: true,
        playerId: true,
        player: { select: { nome: true } },
        round: { select: { id: true, numero: true } },
      },
    }),
  ]);

  const fotoById = new Map(fotos.map((f) => [f.id, f.photoUrl]));
  const rowsWithPhoto = rows.map((r) => ({ ...r, photoUrl: fotoById.get(r.playerId) ?? null }));

  const byRound = new Map<string, { id: string; numero: number | null; results: { nome: string; tier: string; pts: number; isMe: boolean }[] }>();
  for (const r of rr) {
    const k = r.round.id;
    if (!byRound.has(k)) byRound.set(k, { id: k, numero: r.round.numero, results: [] });
    byRound.get(k)!.results.push({ nome: r.player.nome, tier: r.tier, pts: r.pointsAwarded, isMe: r.playerId === playerId });
  }
  const rodadas = [...byRound.values()]
    .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
    .map((rd) => ({
      id: rd.id,
      numero: rd.numero ?? 0,
      results: rd.results
        .sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.nome.localeCompare(b.nome))
        .map((x, i) => ({ pos: i + 1, nome: x.nome, tierLabel: TIER_LABEL[x.tier] ?? "", pts: x.pts, isMe: x.isMe })),
    }));

  return {
    championship: { nome: champ.nome, temporada: champ.temporada },
    totalRodadas,
    rodadasEncerradas,
    rows: rowsWithPhoto,
    pneu,
    rodadas,
  };
}
