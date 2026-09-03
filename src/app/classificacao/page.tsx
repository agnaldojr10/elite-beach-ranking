import { requirePlayer } from "@/lib/auth-guard";
import { PlayerShell } from "@/components/player/PlayerShell";

export const dynamic = "force-dynamic";

export default async function ClassificacaoPage() {
  await requirePlayer();
  return (
    <PlayerShell>
      <h1 className="mb-4 pt-3 text-[20px] font-extrabold text-ink">Ranking</h1>
      <p className="rounded-2xl border border-line bg-card p-4 text-[12.5px] text-muted">Em breve.</p>
    </PlayerShell>
  );
}
