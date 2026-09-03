import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;
function ensureConfig(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:contato@elitebeach.app";
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  }
  return true;
}

export type PushPayload = { title: string; body: string; url?: string };

export async function savePushSubscription(
  playerId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
): Promise<void> {
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { playerId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    update: { playerId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

/** Envia uma notificação a vários atletas (silencioso se VAPID não configurado). */
export async function notifyPlayers(playerIds: string[], payload: PushPayload): Promise<void> {
  if (!ensureConfig() || playerIds.length === 0) return;
  const subs = await prisma.pushSubscription.findMany({ where: { playerId: { in: playerIds } } });
  const data = JSON.stringify(payload);
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
        );
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: s.endpoint } });
        }
      }
    }),
  );
}

/** Atletas (com acesso e push) inscritos numa rodada — para avisar do sorteio/resultado. */
export async function playersDaRodada(roundId: string): Promise<string[]> {
  const teams = await prisma.team.findMany({
    where: { roundId },
    select: { player1Id: true, player2Id: true },
  });
  const ids = new Set<string>();
  for (const t of teams) {
    ids.add(t.player1Id);
    ids.add(t.player2Id);
  }
  return [...ids];
}
