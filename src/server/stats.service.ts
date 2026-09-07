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
