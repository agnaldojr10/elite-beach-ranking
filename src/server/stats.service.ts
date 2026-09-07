import { prisma } from "@/lib/prisma";
import { getActiveChampionship } from "@/server/player.service";

export type MatchEvent = {
  numero: number;
  a: [string, string];
  b: [string, string];
  sa: number;
  sb: number;
};

const PHASE_ORDER: Record<string, number> = { GRUPOS: 0, QUARTAS: 1, SEMIFINAL: 2, FINAL: 3, TERCEIRO: 4 };

/** Carrega os jogos com placar do campeonato, em ordem cronológica aproximada. */
async function loadEvents(championshipId: string): Promise<{ events: MatchEvent[]; nome: Map<string, string> }> {
  const teams = await prisma.team.findMany({
    where: { round: { championshipId, isFinals: false } },
    select: {
      id: true,
      player1Id: true,
      player2Id: true,
      player1: { select: { nome: true } },
      player2: { select: { nome: true } },
      round: { select: { numero: true } },
    },
  });
  const teamMap = new Map(teams.map((t) => [t.id, [t.player1Id, t.player2Id] as [string, string]]));
  const nome = new Map<string, string>();
  for (const t of teams) {
    nome.set(t.player1Id, t.player1.nome);
    nome.set(t.player2Id, t.player2.nome);
  }

  const matches = await prisma.match.findMany({
    where: { round: { championshipId, isFinals: false }, scoreA: { not: null }, scoreB: { not: null } },
    select: {
      phase: true,
      slot: true,
      teamAId: true,
      teamBId: true,
      scoreA: true,
      scoreB: true,
      round: { select: { numero: true } },
    },
  });

  const raw = matches
    .map((m) => ({
      numero: m.round.numero ?? 0,
      phase: PHASE_ORDER[m.phase] ?? 9,
      slot: m.slot ?? 0,
      a: teamMap.get(m.teamAId),
      b: teamMap.get(m.teamBId),
      sa: m.scoreA as number,
      sb: m.scoreB as number,
    }))
    .filter((m) => m.a && m.b)
    .sort((x, y) => x.numero - y.numero || x.phase - y.phase || x.slot - y.slot);

  const events: MatchEvent[] = raw.map((m) => ({ numero: m.numero, a: m.a!, b: m.b!, sa: m.sa, sb: m.sb }));
  return { events, nome };
}

/** ELO simples: dupla = média dos 2; K=24; início 1000. Recalculado do histórico. */
function computeElo(events: MatchEvent[]): Map<string, number> {
  const R = new Map<string, number>();
  const K = 24;
  const get = (id: string) => R.get(id) ?? 1000;
  for (const e of events) {
    const ra = (get(e.a[0]) + get(e.a[1])) / 2;
    const rb = (get(e.b[0]) + get(e.b[1])) / 2;
    const ea = 1 / (1 + 10 ** ((rb - ra) / 400));
    const sa = e.sa > e.sb ? 1 : 0;
    const da = K * (sa - ea);
    const db = K * (1 - sa - (1 - ea));
    for (const p of e.a) R.set(p, get(p) + da);
    for (const p of e.b) R.set(p, get(p) + db);
  }
  const out = new Map<string, number>();
  for (const [id, r] of R) out.set(id, Math.round(r));
  return out;
}

type Agg = { jogos: number; vitorias: number; gp: number; gc: number; maxStreak: number };

/** Agregados por jogador a partir dos eventos (ordem cronológica). */
function computeAggregates(events: MatchEvent[]): Map<string, Agg> {
  const m = new Map<string, Agg & { cur: number }>();
  const get = (id: string) => {
    let a = m.get(id);
    if (!a) { a = { jogos: 0, vitorias: 0, gp: 0, gc: 0, maxStreak: 0, cur: 0 }; m.set(id, a); }
    return a;
  };
  for (const e of events) {
    for (const side of ["a", "b"] as const) {
      const players = side === "a" ? e.a : e.b;
      const my = side === "a" ? e.sa : e.sb;
      const opp = side === "a" ? e.sb : e.sa;
      const won = my > opp;
      for (const p of players) {
        const a = get(p);
        a.jogos++;
        a.gp += my;
        a.gc += opp;
        if (won) { a.vitorias++; a.cur++; a.maxStreak = Math.max(a.maxStreak, a.cur); }
        else a.cur = 0;
      }
    }
  }
  const out = new Map<string, Agg>();
  for (const [id, a] of m) out.set(id, { jogos: a.jogos, vitorias: a.vitorias, gp: a.gp, gc: a.gc, maxStreak: a.maxStreak });
  return out;
}

function nivelLabel(rating: number): string {
  if (rating >= 1150) return "Elite";
  if (rating >= 1060) return "Avançado";
  if (rating >= 970) return "Intermediário";
  return "Em ascensão";
}

const primeiro = (n: string) => n.split(" ")[0];

export type Conquista = { icon: string; label: string; hint: string };

export type AthleteStats = {
  isSelf: boolean;
  rating: number;
  nivel: string;
  ratingRank: number;
  totalRated: number;
  forma: ("V" | "D")[];
  maxStreak: number;
  parceiros: { nome: string; jogos: number; vitorias: number; winPct: number }[];
  fregues: { nome: string; vitorias: number; jogos: number } | null;
  algoz: { nome: string; derrotas: number; jogos: number } | null;
  h2h: { nome: string; winsMe: number; winsThem: number; gamesMe: number; gamesThem: number; jogos: number } | null;
  conquistas: Conquista[];
};

export async function getAthleteStats(viewerId: string, athleteId: string): Promise<AthleteStats | null> {
  const champ = await getActiveChampionship();
  if (!champ) return null;
  const { events, nome } = await loadEvents(champ.id);

  // ELO + rank
  const elo = computeElo(events);
  const ratingList = [...elo.entries()].sort((a, b) => b[1] - a[1]);
  const rating = elo.get(athleteId) ?? 1000;
  const ratingRank = ratingList.findIndex(([id]) => id === athleteId) + 1 || ratingList.length + 1;

  // percorre eventos do atleta para forma, parceiros e rivais
  const parceiros = new Map<string, { jogos: number; vitorias: number }>();
  const rivais = new Map<string, { jogos: number; vitorias: number; derrotas: number }>();
  const forma: ("V" | "D")[] = [];

  for (const e of events) {
    const inA = e.a.includes(athleteId);
    const inB = e.b.includes(athleteId);
    if (!inA && !inB) continue;
    const meScore = inA ? e.sa : e.sb;
    const oppScore = inA ? e.sb : e.sa;
    const won = meScore > oppScore;
    forma.push(won ? "V" : "D");

    const partnerId = inA ? e.a.find((p) => p !== athleteId) : e.b.find((p) => p !== athleteId);
    if (partnerId) {
      const rec = parceiros.get(partnerId) ?? { jogos: 0, vitorias: 0 };
      rec.jogos++;
      if (won) rec.vitorias++;
      parceiros.set(partnerId, rec);
    }
    const opps = inA ? e.b : e.a;
    for (const o of opps) {
      const rec = rivais.get(o) ?? { jogos: 0, vitorias: 0, derrotas: 0 };
      rec.jogos++;
      if (won) rec.vitorias++;
      else rec.derrotas++;
      rivais.set(o, rec);
    }
  }

  // melhor sequência de vitórias (forma completa)
  let maxStreak = 0, cur = 0;
  for (const f of forma) {
    if (f === "V") { cur++; maxStreak = Math.max(maxStreak, cur); }
    else cur = 0;
  }

  const parceirosArr = [...parceiros.entries()]
    .map(([id, r]) => ({ nome: primeiro(nome.get(id) ?? "?"), jogos: r.jogos, vitorias: r.vitorias, winPct: Math.round((r.vitorias / r.jogos) * 100) }))
    .sort((a, b) => b.jogos - a.jogos || b.winPct - a.winPct)
    .slice(0, 4);

  const rivaisArr = [...rivais.entries()];
  const freguesEntry = rivaisArr.filter(([, r]) => r.vitorias > 0).sort((a, b) => b[1].vitorias - a[1].vitorias)[0];
  const algozEntry = rivaisArr.filter(([, r]) => r.derrotas > 0).sort((a, b) => b[1].derrotas - a[1].derrotas)[0];
  const fregues = freguesEntry ? { nome: primeiro(nome.get(freguesEntry[0]) ?? "?"), vitorias: freguesEntry[1].vitorias, jogos: freguesEntry[1].jogos } : null;
  const algoz = algozEntry ? { nome: primeiro(nome.get(algozEntry[0]) ?? "?"), derrotas: algozEntry[1].derrotas, jogos: algozEntry[1].jogos } : null;

  // confronto direto viewer x atleta
  let h2h: AthleteStats["h2h"] = null;
  if (viewerId !== athleteId) {
    let winsMe = 0, winsThem = 0, gamesMe = 0, gamesThem = 0, jogos = 0;
    for (const e of events) {
      const meTeam = e.a.includes(viewerId) ? "a" : e.b.includes(viewerId) ? "b" : null;
      const themTeam = e.a.includes(athleteId) ? "a" : e.b.includes(athleteId) ? "b" : null;
      if (meTeam && themTeam && meTeam !== themTeam) {
        const meScore = meTeam === "a" ? e.sa : e.sb;
        const themScore = meTeam === "a" ? e.sb : e.sa;
        gamesMe += meScore;
        gamesThem += themScore;
        if (meScore > themScore) winsMe++;
        else winsThem++;
        jogos++;
      }
    }
    if (jogos > 0) h2h = { nome: primeiro(nome.get(athleteId) ?? "?"), winsMe, winsThem, gamesMe, gamesThem, jogos };
  }

  // conquistas (medalhas) derivadas
  const tiers = await prisma.roundResult.findMany({
    where: { playerId: athleteId, round: { championshipId: champ.id, isFinals: false } },
    select: { tier: true },
  });
  const titulos = tiers.filter((t) => t.tier === "CAMPEAO").length;
  const podios = tiers.filter((t) => ["CAMPEAO", "VICE", "TERCEIRO"].includes(t.tier)).length;

  const conquistas: Conquista[] = [];
  if (titulos > 0) conquistas.push({ icon: "🏆", label: titulos === 1 ? "Campeão de etapa" : `${titulos}× campeão`, hint: "Venceu a rodada" });
  if (podios >= 3) conquistas.push({ icon: "🥇", label: "Frequentador do pódio", hint: `${podios} pódios` });
  if (maxStreak >= 3) conquistas.push({ icon: "🔥", label: `Sequência de ${maxStreak}`, hint: "Vitórias seguidas" });
  const dupla = parceirosArr.find((p) => p.jogos >= 3 && p.winPct === 100);
  if (dupla) conquistas.push({ icon: "🤝", label: "Dupla imbatível", hint: `100% com ${dupla.nome}` });
  if (rating >= 1150) conquistas.push({ icon: "⭐", label: "Nível Elite", hint: `Rating ${rating}` });

  return {
    isSelf: viewerId === athleteId,
    rating,
    nivel: nivelLabel(rating),
    ratingRank,
    totalRated: ratingList.length,
    forma: forma.slice(-6),
    maxStreak,
    parceiros: parceirosArr,
    fregues,
    algoz,
    h2h,
    conquistas,
  };
}

/* ---------------- Recordes do campeonato ---------------- */

export type Recorde = { icon: string; label: string; nome: string; valor: string };

export async function getChampionshipRecords(): Promise<{ championship: string | null; recordes: Recorde[] }> {
  const champ = await getActiveChampionship();
  if (!champ) return { championship: null, recordes: [] };
  const { events, nome } = await loadEvents(champ.id);
  if (events.length === 0) return { championship: champ.nome, recordes: [] };

  const agg = computeAggregates(events);
  const nm = (id: string) => primeiro(nome.get(id) ?? "?");
  const arr = [...agg.entries()].filter(([, a]) => a.jogos > 0);

  const best = <T,>(items: [string, Agg][], score: (a: Agg) => number, min = 1) => {
    const elig = items.filter(([, a]) => a.jogos >= min);
    if (elig.length === 0) return null;
    return elig.reduce((b, x) => (score(x[1]) > score(b[1]) ? x : b));
  };

  const recordes: Recorde[] = [];
  const artilheiro = best(arr, (a) => a.gp);
  if (artilheiro) recordes.push({ icon: "🎯", label: "Artilheiro", nome: nm(artilheiro[0]), valor: `${artilheiro[1].gp} games` });

  const muralha = best(arr, (a) => a.gp - a.gc);
  if (muralha) {
    const s = muralha[1].gp - muralha[1].gc;
    recordes.push({ icon: "🧱", label: "Muralha (saldo)", nome: nm(muralha[0]), valor: `${s >= 0 ? "+" : ""}${s}` });
  }

  const seq = best(arr, (a) => a.maxStreak);
  if (seq && seq[1].maxStreak >= 2) recordes.push({ icon: "🔥", label: "Maior sequência", nome: nm(seq[0]), valor: `${seq[1].maxStreak} vitórias` });

  // regularidade: melhor aproveitamento com mínimo de jogos (cai o mínimo se ninguém elegível)
  const minJogos = Math.max(...arr.map(([, a]) => a.jogos));
  const cut = Math.min(6, Math.max(3, Math.floor(minJogos / 2)));
  const reg = best(arr, (a) => a.vitorias / a.jogos, cut);
  if (reg) recordes.push({ icon: "📈", label: "Mais regular", nome: nm(reg[0]), valor: `${Math.round((reg[1].vitorias / reg[1].jogos) * 100)}%` });

  // colecionador de títulos (RoundResult)
  const titles = await prisma.roundResult.groupBy({
    by: ["playerId"],
    where: { tier: "CAMPEAO", round: { championshipId: champ.id, isFinals: false } },
    _count: { playerId: true },
  });
  const topTitle = titles.sort((a, b) => b._count.playerId - a._count.playerId)[0];
  if (topTitle && topTitle._count.playerId > 0) {
    recordes.push({ icon: "🏆", label: "Colecionador", nome: nm(topTitle.playerId), valor: `${topTitle._count.playerId} título(s)` });
  }

  return { championship: champ.nome, recordes };
}

/* ---------------- Comparar dois atletas ---------------- */

export type CompareSide = {
  id: string;
  nome: string;
  photoUrl: string | null;
  rating: number;
  nivel: string;
  jogos: number;
  vitorias: number;
  winPct: number;
  saldo: number;
  gamesPro: number;
  maxStreak: number;
  titulos: number;
};

export type Comparacao = {
  a: CompareSide;
  b: CompareSide;
  h2h: { winsA: number; winsB: number; gamesA: number; gamesB: number; jogos: number } | null;
};

export async function getPlayerOptions(): Promise<{ id: string; nome: string }[]> {
  const champ = await getActiveChampionship();
  if (!champ) return [];
  const players = await prisma.player.findMany({
    where: { active: true, type: "REGULAR", teamsAsP1: { some: { round: { championshipId: champ.id } } } },
    select: { id: true, nome: true },
  });
  const p2 = await prisma.player.findMany({
    where: { active: true, type: "REGULAR", teamsAsP2: { some: { round: { championshipId: champ.id } } } },
    select: { id: true, nome: true },
  });
  const map = new Map<string, string>();
  for (const p of [...players, ...p2]) map.set(p.id, p.nome);
  return [...map.entries()].map(([id, n]) => ({ id, nome: n })).sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function compareAthletes(aId: string, bId: string): Promise<Comparacao | null> {
  const champ = await getActiveChampionship();
  if (!champ || aId === bId) return null;
  const { events } = await loadEvents(champ.id);
  const agg = computeAggregates(events);
  const elo = computeElo(events);

  const players = await prisma.player.findMany({
    where: { id: { in: [aId, bId] } },
    select: { id: true, nome: true, photoUrl: true },
  });
  const pmap = new Map(players.map((p) => [p.id, p]));
  if (!pmap.has(aId) || !pmap.has(bId)) return null;

  const titles = await prisma.roundResult.groupBy({
    by: ["playerId"],
    where: { tier: "CAMPEAO", playerId: { in: [aId, bId] }, round: { championshipId: champ.id, isFinals: false } },
    _count: { playerId: true },
  });
  const titleMap = new Map(titles.map((t) => [t.playerId, t._count.playerId]));

  const side = (id: string): CompareSide => {
    const a = agg.get(id) ?? { jogos: 0, vitorias: 0, gp: 0, gc: 0, maxStreak: 0 };
    const r = elo.get(id) ?? 1000;
    const p = pmap.get(id)!;
    return {
      id,
      nome: p.nome,
      photoUrl: p.photoUrl,
      rating: r,
      nivel: nivelLabel(r),
      jogos: a.jogos,
      vitorias: a.vitorias,
      winPct: a.jogos > 0 ? Math.round((a.vitorias / a.jogos) * 100) : 0,
      saldo: a.gp - a.gc,
      gamesPro: a.gp,
      maxStreak: a.maxStreak,
      titulos: titleMap.get(id) ?? 0,
    };
  };

  // h2h entre os dois
  let winsA = 0, winsB = 0, gamesA = 0, gamesB = 0, jogos = 0;
  for (const e of events) {
    const aTeam = e.a.includes(aId) ? "a" : e.b.includes(aId) ? "b" : null;
    const bTeam = e.a.includes(bId) ? "a" : e.b.includes(bId) ? "b" : null;
    if (aTeam && bTeam && aTeam !== bTeam) {
      const sA = aTeam === "a" ? e.sa : e.sb;
      const sB = aTeam === "a" ? e.sb : e.sa;
      gamesA += sA; gamesB += sB;
      if (sA > sB) winsA++; else winsB++;
      jogos++;
    }
  }

  return {
    a: side(aId),
    b: side(bId),
    h2h: jogos > 0 ? { winsA, winsB, gamesA, gamesB, jogos } : null,
  };
}

/* ---------------- Evolução de posição + presença ---------------- */

export type Evolucao = {
  presenca: { jogadas: number; total: number };
  pontos: number;
  serie: { numero: number; pos: number; total: number }[];
};

export async function getPositionEvolution(playerId: string): Promise<Evolucao> {
  const champ = await getActiveChampionship();
  const vazio: Evolucao = { presenca: { jogadas: 0, total: 0 }, pontos: 0, serie: [] };
  if (!champ) return vazio;

  const [results, totalRodadas] = await Promise.all([
    prisma.roundResult.findMany({
      where: { round: { championshipId: champ.id, isFinals: false } },
      select: { playerId: true, pointsAwarded: true, round: { select: { numero: true } } },
      orderBy: { round: { numero: "asc" } },
    }),
    prisma.round.count({ where: { championshipId: champ.id, isFinals: false } }),
  ]);

  // rodadas encerradas distintas, em ordem
  const numeros = [...new Set(results.map((r) => r.round.numero ?? 0))].sort((a, b) => a - b);
  const acumulado = new Map<string, number>();
  const serie: { numero: number; pos: number; total: number }[] = [];

  for (const n of numeros) {
    for (const r of results.filter((x) => (x.round.numero ?? 0) === n)) {
      acumulado.set(r.playerId, (acumulado.get(r.playerId) ?? 0) + r.pointsAwarded);
    }
    const rank = [...acumulado.entries()].sort((a, b) => b[1] - a[1]);
    const pos = rank.findIndex(([id]) => id === playerId) + 1;
    if (pos > 0) serie.push({ numero: n, pos, total: rank.length });
  }

  const jogadas = new Set(results.filter((r) => r.playerId === playerId).map((r) => r.round.numero)).size;
  const pontos = acumulado.get(playerId) ?? 0;
  return { presenca: { jogadas, total: totalRodadas }, pontos, serie };
}
