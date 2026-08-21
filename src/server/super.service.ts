import { prisma } from "@/lib/prisma";
import { buildSuperSchedule } from "@/lib/super/schedule";
import { SuperCreateSchema, type SuperCreateInput } from "@/lib/schemas/super";

function toDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Cria o torneio, distribui os atletas nos assentos e gera todos os jogos. */
export async function createSuperTournament(input: SuperCreateInput): Promise<{ id: string }> {
  const v = SuperCreateSchema.parse(input);

  const schedule = buildSuperSchedule(v.size);

  const tournament = await prisma.$transaction(async (tx) => {
    const t = await tx.superTournament.create({
      data: {
        nome: v.nome,
        data: toDate(v.data),
        size: v.size,
        courts: v.courts,
        gamesPerMatch: v.gamesPerMatch,
      },
    });

    // assento = posição na lista escolhida
    await tx.superPlayer.createMany({
      data: v.playerIds.map((playerId, seat) => ({
        tournamentId: t.id,
        playerId,
        seat,
      })),
    });

    const matches = schedule.flatMap((round) =>
      round.games.map((g, idx) => ({
        tournamentId: t.id,
        rodada: round.rodada,
        quadra: (idx % v.courts) + 1,
        a1: g.a1,
        a2: g.a2,
        b1: g.b1,
        b2: g.b2,
      })),
    );
    await tx.superMatch.createMany({ data: matches });

    return t;
  });

  return { id: tournament.id };
}

/** Salva o placar de um jogo (soma = total de games; sem empate). */
export async function saveSuperScore(
  matchId: string,
  scoreA: number,
  scoreB: number,
): Promise<void> {
  const match = await prisma.superMatch.findUnique({
    where: { id: matchId },
    include: { tournament: { select: { gamesPerMatch: true, status: true } } },
  });
  if (!match) throw new Error("Jogo não encontrado.");
  if (match.tournament.status === "ENCERRADO") throw new Error("Torneio encerrado.");

  const total = match.tournament.gamesPerMatch;
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0) {
    throw new Error("Placar inválido.");
  }
  if (scoreA + scoreB !== total) {
    throw new Error(`A soma dos games deve ser ${total} (ex.: ${total - 1}-1).`);
  }
  if (scoreA === scoreB) throw new Error("Empate não é permitido.");

  await prisma.superMatch.update({ where: { id: matchId }, data: { scoreA, scoreB } });
}

export type SuperStanding = {
  playerId: string;
  nome: string;
  photoUrl: string | null;
  jogos: number;
  vitorias: number;
  saldo: number;
  gamesPro: number;
};

/** Classificação do dia: soma por atleta (V -> Saldo -> Games a favor). */
export async function getSuperStandings(tournamentId: string): Promise<SuperStanding[]> {
  const [players, matches] = await Promise.all([
    prisma.superPlayer.findMany({
      where: { tournamentId },
      include: { player: { select: { id: true, nome: true, photoUrl: true } } },
    }),
    prisma.superMatch.findMany({ where: { tournamentId } }),
  ]);

  const stat = new Map<
    number,
    { jogos: number; vitorias: number; pro: number; contra: number }
  >();
  for (const p of players) stat.set(p.seat, { jogos: 0, vitorias: 0, pro: 0, contra: 0 });

  for (const m of matches) {
    if (m.scoreA == null || m.scoreB == null) continue;
    const ladoA = [m.a1, m.a2];
    const ladoB = [m.b1, m.b2];
    const aWins = m.scoreA > m.scoreB;
    for (const s of ladoA) {
      const st = stat.get(s);
      if (!st) continue;
      st.jogos++;
      st.pro += m.scoreA;
      st.contra += m.scoreB;
      if (aWins) st.vitorias++;
    }
    for (const s of ladoB) {
      const st = stat.get(s);
      if (!st) continue;
      st.jogos++;
      st.pro += m.scoreB;
      st.contra += m.scoreA;
      if (!aWins) st.vitorias++;
    }
  }

  const rows: SuperStanding[] = players.map((p) => {
    const st = stat.get(p.seat)!;
    return {
      playerId: p.player.id,
      nome: p.player.nome,
      photoUrl: p.player.photoUrl,
      jogos: st.jogos,
      vitorias: st.vitorias,
      saldo: st.pro - st.contra,
      gamesPro: st.pro,
    };
  });

  rows.sort(
    (a, b) =>
      b.vitorias - a.vitorias || b.saldo - a.saldo || b.gamesPro - a.gamesPro ||
      a.nome.localeCompare(b.nome),
  );
  return rows;
}

/** Texto para o WhatsApp: classificação do dia (com pódio no topo). */
export async function buildSuperExport(tournamentId: string): Promise<string> {
  const t = await prisma.superTournament.findUnique({ where: { id: tournamentId } });
  if (!t) throw new Error("Torneio não encontrado.");
  const rows = await getSuperStandings(tournamentId);

  const medal = ["🥇", "🥈", "🥉"];
  const linhas = rows.map((r, i) => {
    const pos = i < 3 ? medal[i] : `${i + 1}.`;
    return `${pos} ${r.nome} — ${r.vitorias}V · SG ${r.saldo >= 0 ? "+" : ""}${r.saldo} · ${r.gamesPro} games`;
  });

  return [`🏖️ ${t.nome} — Super ${t.size}`, "", "🏆 Classificação do dia", ...linhas].join("\n");
}
