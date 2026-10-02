import { prisma } from "@/lib/prisma";

export type RankingRow = {
  posicao: number;
  playerId: string;
  nome: string;
  photoUrl: string | null;
  pontos: number;
  variacao: "up" | "down" | "same";
};

export type PneuDetalhe = { rodada: number | null; adversarios: string; parceiro: string };
export type PneuRow = {
  playerId: string;
  nome: string;
  photoUrl: string | null;
  vezes: number;
  detalhes: PneuDetalhe[];
};
export type PneuInfo = {
  playerId: string;
  nome: string;
  vezes: number;
  detalhes: PneuDetalhe[];
} | null;

export type RankingGeral = { rows: RankingRow[]; pneu: PneuInfo; pneuRanking: PneuRow[] };

type Agg = { pontos: number; wins: number; saldo: number; gp: number };

/** Ordena por Pontos → Vitórias → Saldo de games → Games a favor → nome. */
function rankByCriteria(aggs: Map<string, Agg>, nome: (id: string) => string): Map<string, number> {
  const ordered = [...aggs.entries()].sort((a, b) => {
    const A = a[1];
    const B = b[1];
    return (
      B.pontos - A.pontos ||
      B.wins - A.wins ||
      B.saldo - A.saldo ||
      B.gp - A.gp ||
      nome(a[0]).localeCompare(nome(b[0]))
    );
  });
  const pos = new Map<string, number>();
  ordered.forEach(([playerId], i) => pos.set(playerId, i + 1));
  return pos;
}

/**
 * Ranking geral do campeonato: soma dos RoundResult por jogador (só REGULAR).
 * Empate em pontos é desempatado por Vitórias → Saldo de games → Games a favor.
 * Traz variação ↑/↓ (posição antes da última rodada) e o troféu pneu.
 */
export async function getRankingGeral(championshipId: string): Promise<RankingGeral> {
  const [results, teams, matches] = await Promise.all([
    prisma.roundResult.findMany({
      where: { round: { championshipId, isFinals: false } },
      select: {
        playerId: true,
        pointsAwarded: true,
        round: { select: { numero: true } },
        player: { select: { nome: true, type: true, active: true, photoUrl: true } },
      },
    }),
    prisma.team.findMany({
      where: { round: { championshipId, isFinals: false } },
      select: { id: true, player1Id: true, player2Id: true, round: { select: { numero: true } } },
    }),
    prisma.match.findMany({
      where: { round: { championshipId, isFinals: false }, scoreA: { not: null }, scoreB: { not: null } },
      select: { teamAId: true, teamBId: true, scoreA: true, scoreB: true, round: { select: { numero: true } } },
    }),
  ]);

  const regulars = results.filter((r) => r.player.type === "REGULAR" && r.player.active);
  const nomeById = new Map(regulars.map((r) => [r.playerId, r.player.nome]));
  const fotoById = new Map(regulars.map((r) => [r.playerId, r.player.photoUrl]));

  const totals = new Map<string, number>();
  for (const r of regulars) totals.set(r.playerId, (totals.get(r.playerId) ?? 0) + r.pointsAwarded);

  const lastNumero = regulars.reduce<number | null>((max, r) => {
    const n = r.round.numero ?? null;
    return n != null && (max == null || n > max) ? n : max;
  }, null);

  const prevTotals = new Map<string, number>();
  for (const r of regulars) {
    if (lastNumero != null && r.round.numero === lastNumero) continue;
    prevTotals.set(r.playerId, (prevTotals.get(r.playerId) ?? 0) + r.pointsAwarded);
  }

  // V / SG / GP por jogador (temporada e "antes da última rodada").
  const teamMap = new Map(teams.map((t) => [t.id, { players: [t.player1Id, t.player2Id], numero: t.round.numero }]));
  const statsAll = new Map<string, { wins: number; saldo: number; gp: number }>();
  const statsPrev = new Map<string, { wins: number; saldo: number; gp: number }>();
  const bump = (map: typeof statsAll, id: string, w: number, s: number, g: number) => {
    const cur = map.get(id) ?? { wins: 0, saldo: 0, gp: 0 };
    cur.wins += w; cur.saldo += s; cur.gp += g;
    map.set(id, cur);
  };
  for (const m of matches) {
    const numero = m.round.numero;
    const isPrev = lastNumero == null || numero !== lastNumero;
    const a = m.scoreA as number;
    const b = m.scoreB as number;
    const ta = teamMap.get(m.teamAId);
    const tb = teamMap.get(m.teamBId);
    if (ta) for (const p of ta.players) { bump(statsAll, p, a > b ? 1 : 0, a - b, a); if (isPrev) bump(statsPrev, p, a > b ? 1 : 0, a - b, a); }
    if (tb) for (const p of tb.players) { bump(statsAll, p, b > a ? 1 : 0, b - a, b); if (isPrev) bump(statsPrev, p, b > a ? 1 : 0, b - a, b); }
  }

  const aggAll = new Map<string, Agg>();
  for (const [id, pontos] of totals) {
    const s = statsAll.get(id) ?? { wins: 0, saldo: 0, gp: 0 };
    aggAll.set(id, { pontos, wins: s.wins, saldo: s.saldo, gp: s.gp });
  }
  const aggPrev = new Map<string, Agg>();
  for (const [id, pontos] of prevTotals) {
    const s = statsPrev.get(id) ?? { wins: 0, saldo: 0, gp: 0 };
    aggPrev.set(id, { pontos, wins: s.wins, saldo: s.saldo, gp: s.gp });
  }

  const currPos = rankByCriteria(aggAll, (id) => nomeById.get(id) ?? "");
  const prevPos = rankByCriteria(aggPrev, (id) => nomeById.get(id) ?? "");

  const rows: RankingRow[] = [...totals.entries()]
    .map(([playerId, pontos]) => {
      const cur = currPos.get(playerId)!;
      const prev = prevPos.get(playerId);
      let variacao: RankingRow["variacao"] = "same";
      if (prev != null) variacao = cur < prev ? "up" : cur > prev ? "down" : "same";
      return {
        posicao: cur,
        playerId,
        nome: nomeById.get(playerId) ?? "",
        photoUrl: fotoById.get(playerId) ?? null,
        pontos,
        variacao,
      };
    })
    .sort((a, b) => a.posicao - b.posicao);

  const pneuRanking = await getPneuRanking(championshipId);
  const top = pneuRanking[0];
  const pneu: PneuInfo = top
    ? { playerId: top.playerId, nome: top.nome, vezes: top.vezes, detalhes: top.detalhes }
    : null;
  return { rows, pneu, pneuRanking };
}

/**
 * Ranking do Pneu: TODOS que já levaram 6×0 no campeonato, com a contagem e os
 * detalhes (rodada, adversários, parceiro). Ordenado por vezes (desc) → nome.
 */
export async function getPneuRanking(championshipId: string): Promise<PneuRow[]> {
  const matches = await prisma.match.findMany({
    where: {
      round: { championshipId },
      OR: [
        { scoreA: 6, scoreB: 0 },
        { scoreA: 0, scoreB: 6 },
      ],
    },
    select: {
      teamAId: true,
      teamBId: true,
      scoreA: true,
      scoreB: true,
      round: { select: { numero: true } },
    },
  });
  if (matches.length === 0) return [];

  const teamIds = [...new Set(matches.flatMap((m) => [m.teamAId, m.teamBId]))];
  const teams = await prisma.team.findMany({
    where: { id: { in: teamIds } },
    include: {
      player1: { select: { id: true, nome: true, type: true, photoUrl: true } },
      player2: { select: { id: true, nome: true, type: true, photoUrl: true } },
    },
  });
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const data = new Map<string, { nome: string; photoUrl: string | null; detalhes: PneuDetalhe[] }>();
  for (const m of matches) {
    const loserId = m.scoreA === 6 ? m.teamBId : m.teamAId;
    const winnerId = m.scoreA === 6 ? m.teamAId : m.teamBId;
    const loser = teamById.get(loserId);
    const winner = teamById.get(winnerId);
    if (!loser || !winner) continue;
    for (const pl of [loser.player1, loser.player2]) {
      if (pl.type !== "REGULAR") continue;
      const rec = data.get(pl.id) ?? { nome: pl.nome, photoUrl: pl.photoUrl, detalhes: [] };
      const parceiro = loser.player1.id === pl.id ? loser.player2.nome : loser.player1.nome;
      rec.detalhes.push({
        rodada: m.round?.numero ?? null,
        adversarios: `${winner.player1.nome} & ${winner.player2.nome}`,
        parceiro,
      });
      data.set(pl.id, rec);
    }
  }

  const rows: PneuRow[] = [...data.entries()].map(([playerId, r]) => ({
    playerId,
    nome: r.nome,
    photoUrl: r.photoUrl,
    vezes: r.detalhes.length,
    detalhes: r.detalhes.sort((a, b) => (a.rodada ?? 0) - (b.rodada ?? 0)),
  }));
  rows.sort((a, b) => b.vezes - a.vezes || a.nome.localeCompare(b.nome));
  return rows;
}

/** Jogador com mais placares de 6x0 sofridos (topo do ranking do pneu). */
export async function getPneu(championshipId: string): Promise<PneuInfo> {
  const [top] = await getPneuRanking(championshipId);
  if (!top) return null;
  return { playerId: top.playerId, nome: top.nome, vezes: top.vezes, detalhes: top.detalhes };
}
