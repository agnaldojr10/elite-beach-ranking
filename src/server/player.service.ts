import { prisma } from "@/lib/prisma";
import { getRankingGeral, getPneu, type PneuInfo, type RankingRow } from "@/server/ranking.service";
import { buildGroupStandings } from "@/server/knockout.service";

const KO_ORDER: Record<string, number> = { QUARTAS: 0, SEMIFINAL: 1, FINAL: 2, TERCEIRO: 3 };
const KO_LABEL: Record<string, string> = {
  QUARTAS: "Quartas de final",
  SEMIFINAL: "Semifinal",
  FINAL: "Final",
  TERCEIRO: "Disputa de 3º lugar",
};

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
  rows: RankingRow[];
  pneu: PneuInfo;
  rodadas: { id: string; numero: number; results: { pos: number; nome: string; tierLabel: string; pts: number; isMe: boolean }[] }[];
};

export async function getPlayerRankingData(playerId: string): Promise<PlayerRankingData> {
  const champ = await getActiveChampionship();
  if (!champ) {
    return { championship: null, totalRodadas: 0, rodadasEncerradas: 0, rows: [], pneu: null, rodadas: [] };
  }

  const [{ rows, pneu }, totalRodadas, rodadasEncerradas, rr] = await Promise.all([
    getRankingGeral(champ.id),
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
    rows,
    pneu,
    rodadas,
  };
}

/* ---------------- Minha rodada / confrontos ---------------- */

export type JogoAtleta = {
  adversarios: string;
  scoreA: number | null; // do ponto de vista do atleta
  scoreB: number | null;
  estado: "vitoria" | "derrota" | "em_quadra" | "agendado";
  meta: string;
};

export type PlayerRound = {
  round: { id: string; numero: number | null; data: string; status: string; numGrupos: number } | null;
  myTeam: { label: string; grupo: string | null } | null;
  jogos: JogoAtleta[];
  group: { grupo: string; rows: { label: string; wins: number; saldo: number; gp: number; isMe: boolean }[] } | null;
  mataMata: { phaseLabel: string; labelA: string; labelB: string; scoreA: number | null; scoreB: number | null }[];
};

const dupla = (a: string, b: string) => `${a} & ${b}`;

export async function getPlayerRound(playerId: string, roundId?: string): Promise<PlayerRound> {
  const champ = await getActiveChampionship();
  const empty: PlayerRound = { round: null, myTeam: null, jogos: [], group: null, mataMata: [] };
  if (!champ) return empty;

  // Rodada específica (clique) ou a mais relevante do atleta (SORTEADA > última).
  let round;
  if (roundId) {
    round = await prisma.round.findFirst({
      where: { id: roundId, championshipId: champ.id, isFinals: false },
      select: { id: true, numero: true, data: true, status: true },
    });
    if (!round) return empty;
  } else {
    const rounds = await prisma.round.findMany({
      where: {
        championshipId: champ.id,
        isFinals: false,
        teams: { some: { OR: [{ player1Id: playerId }, { player2Id: playerId }] } },
      },
      orderBy: { numero: "desc" },
      select: { id: true, numero: true, data: true, status: true },
    });
    if (rounds.length === 0) return empty;
    round = rounds.find((r) => r.status === "SORTEADA") ?? rounds[0];
  }

  const [teams, matches] = await Promise.all([
    prisma.team.findMany({
      where: { roundId: round.id },
      select: {
        id: true,
        grupo: true,
        player1: { select: { id: true, nome: true } },
        player2: { select: { id: true, nome: true } },
      },
    }),
    prisma.match.findMany({
      where: { roundId: round.id },
      select: { id: true, phase: true, grupo: true, slot: true, teamAId: true, teamBId: true, scoreA: true, scoreB: true },
    }),
  ]);

  const label = new Map(teams.map((t) => [t.id, dupla(t.player1.nome, t.player2.nome)]));
  const myTeam = teams.find((t) => t.player1.id === playerId || t.player2.id === playerId) ?? null;
  const numGrupos = new Set(teams.map((t) => t.grupo ?? "A")).size;

  // meus jogos (grupos + mata-mata), na ordem de disputa
  const mine = matches
    .filter((m) => myTeam && (m.teamAId === myTeam.id || m.teamBId === myTeam.id))
    .sort((a, b) => {
      const pa = a.phase === "GRUPOS" ? -1 : KO_ORDER[a.phase] ?? 9;
      const pb = b.phase === "GRUPOS" ? -1 : KO_ORDER[b.phase] ?? 9;
      return pa - pb || (a.slot ?? 0) - (b.slot ?? 0);
    });

  let markedEmQuadra = false;
  const jogos: JogoAtleta[] = mine.map((m) => {
    const sou = m.teamAId === myTeam!.id;
    const meu = sou ? m.scoreA : m.scoreB;
    const dele = sou ? m.scoreB : m.scoreA;
    const advId = sou ? m.teamBId : m.teamAId;
    const meta = m.phase === "GRUPOS" ? `Grupo ${m.grupo ?? "A"}` : KO_LABEL[m.phase] ?? m.phase;
    let estado: JogoAtleta["estado"];
    if (meu != null && dele != null) {
      estado = meu > dele ? "vitoria" : "derrota";
    } else if (round.status === "SORTEADA" && !markedEmQuadra) {
      estado = "em_quadra";
      markedEmQuadra = true;
    } else {
      estado = "agendado";
    }
    return { adversarios: label.get(advId) ?? "a definir", scoreA: meu, scoreB: dele, estado, meta };
  });

  // classificação do meu grupo
  let group: PlayerRound["group"] = null;
  if (myTeam && teams.length > 0) {
    const standings = await buildGroupStandings(round.id);
    const g = standings.find((s) => s.groupName === (myTeam.grupo ?? "A"));
    if (g) {
      group = {
        grupo: g.groupName,
        rows: g.standings.map((s) => ({
          label: label.get(s.teamId) ?? "",
          wins: s.wins,
          saldo: s.gamesBalance,
          gp: s.gamesFor,
          isMe: s.teamId === myTeam.id,
        })),
      };
    }
  }

  const mataMata = matches
    .filter((m) => m.phase !== "GRUPOS")
    .sort((a, b) => (KO_ORDER[a.phase] - KO_ORDER[b.phase]) || (a.slot ?? 0) - (b.slot ?? 0))
    .map((m) => ({
      phaseLabel: KO_LABEL[m.phase] ?? m.phase,
      labelA: label.get(m.teamAId) ?? "",
      labelB: label.get(m.teamBId) ?? "",
      scoreA: m.scoreA,
      scoreB: m.scoreB,
    }));

  return {
    round: {
      id: round.id,
      numero: round.numero,
      data: round.data.toISOString(),
      status: round.status,
      numGrupos,
    },
    myTeam: myTeam ? { label: label.get(myTeam.id) ?? "Você", grupo: myTeam.grupo } : null,
    jogos,
    group,
    mataMata,
  };
}

/* ---------------- Meu desempenho ---------------- */

async function matchStats(playerId: string, championshipId: string) {
  const teams = await prisma.team.findMany({
    where: { round: { championshipId }, OR: [{ player1Id: playerId }, { player2Id: playerId }] },
    select: {
      id: true,
      player1: { select: { id: true, nome: true } },
      player2: { select: { id: true, nome: true } },
    },
  });
  const teamIds = teams.map((t) => t.id);
  const parceiroCount = new Map<string, { nome: string; vezes: number }>();
  for (const t of teams) {
    const outro = t.player1.id === playerId ? t.player2 : t.player1;
    const cur = parceiroCount.get(outro.id);
    if (cur) cur.vezes++;
    else parceiroCount.set(outro.id, { nome: outro.nome, vezes: 1 });
  }
  const parceiros = [...parceiroCount.values()].sort((a, b) => b.vezes - a.vezes).slice(0, 4);

  let jogos = 0, vitorias = 0, gp = 0, gc = 0;
  if (teamIds.length > 0) {
    const mine = new Set(teamIds);
    const matches = await prisma.match.findMany({
      where: {
        round: { championshipId },
        scoreA: { not: null },
        scoreB: { not: null },
        OR: [{ teamAId: { in: teamIds } }, { teamBId: { in: teamIds } }],
      },
      select: { teamAId: true, teamBId: true, scoreA: true, scoreB: true },
    });
    for (const m of matches) {
      const aMine = mine.has(m.teamAId);
      const meu = aMine ? (m.scoreA as number) : (m.scoreB as number);
      const dele = aMine ? (m.scoreB as number) : (m.scoreA as number);
      jogos++;
      gp += meu;
      gc += dele;
      if (meu > dele) vitorias++;
    }
  }
  return { jogos, vitorias, saldo: gp - gc, gamesPro: gp, parceiros };
}

export type PlayerDesempenho = {
  championship: { nome: string } | null;
  pontos: number;
  deltaUltima: number | null;
  melhorTierLabel: string | null;
  vitorias: number;
  jogos: number;
  aproveitamento: number;
  saldo: number;
  gamesPro: number;
  etapas: { numero: number; pts: number }[];
  historico: { roundId: string; numero: number; tierLabel: string; pts: number }[];
  parceiros: { nome: string; vezes: number }[];
  trofeus: { titulos: number; podios: number; pneu: number };
  pneuDetalhe: string | null;
};

export async function getPlayerDesempenho(playerId: string): Promise<PlayerDesempenho> {
  const champ = await getActiveChampionship();
  if (!champ) {
    return {
      championship: null, pontos: 0, deltaUltima: null, melhorTierLabel: null,
      vitorias: 0, jogos: 0, aproveitamento: 0, saldo: 0, gamesPro: 0,
      etapas: [], historico: [], parceiros: [], trofeus: { titulos: 0, podios: 0, pneu: 0 }, pneuDetalhe: null,
    };
  }

  const [results, stats, pneu] = await Promise.all([
    prisma.roundResult.findMany({
      where: { playerId, round: { championshipId: champ.id, isFinals: false } },
      select: { tier: true, pointsAwarded: true, round: { select: { id: true, numero: true } } },
      orderBy: { round: { numero: "asc" } },
    }),
    matchStats(playerId, champ.id),
    getPneu(champ.id),
  ]);

  const pontos = results.reduce((s, r) => s + r.pointsAwarded, 0);
  const deltaUltima = results.length > 0 ? results[results.length - 1].pointsAwarded : null;
  const etapas = results.map((r) => ({ numero: r.round.numero ?? 0, pts: r.pointsAwarded }));
  const historico = results.map((r) => ({
    roundId: r.round.id,
    numero: r.round.numero ?? 0,
    tierLabel: TIER_LABEL[r.tier] ?? r.tier,
    pts: r.pointsAwarded,
  }));
  const melhorTier = results.reduce<string | null>(
    (best, r) => (best == null || TIER_ORDER[r.tier] < TIER_ORDER[best] ? r.tier : best),
    null,
  );
  const titulos = results.filter((r) => r.tier === "CAMPEAO").length;
  const podios = results.filter((r) => ["CAMPEAO", "VICE", "TERCEIRO"].includes(r.tier)).length;
  const pneuVezes = pneu?.playerId === playerId ? pneu.vezes : 0;
  const pneuDetalhe =
    pneu?.playerId === playerId && pneu.detalhes[0]
      ? `Rodada ${pneu.detalhes[0].rodada ?? "?"}: 6×0 para ${pneu.detalhes[0].adversarios} (dupla com ${pneu.detalhes[0].parceiro})`
      : null;

  return {
    championship: { nome: champ.nome },
    pontos,
    deltaUltima,
    melhorTierLabel: melhorTier ? TIER_LABEL[melhorTier] ?? melhorTier : null,
    vitorias: stats.vitorias,
    jogos: stats.jogos,
    aproveitamento: stats.jogos > 0 ? Math.round((stats.vitorias / stats.jogos) * 100) : 0,
    saldo: stats.saldo,
    gamesPro: stats.gamesPro,
    etapas,
    historico,
    parceiros: stats.parceiros,
    trofeus: { titulos, podios, pneu: pneuVezes },
    pneuDetalhe,
  };
}
