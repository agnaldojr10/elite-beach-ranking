import { requireAdmin } from "@/lib/auth-guard";
import { AppShell } from "@/components/AppShell";
import { getActivityLog, type ActivityEntry } from "@/server/audit.service";

export const dynamic = "force-dynamic";

const META: Record<string, { label: string; alerta: boolean; emoji: string }> = {
  SORTEAR: { label: "Sorteou as duplas", alerta: false, emoji: "🎲" },
  RESORTEAR: { label: "RE-SORTEOU as duplas", alerta: true, emoji: "🔁" },
  TROCAR_PARCEIRO: { label: "Trocou parceiro (manual)", alerta: true, emoji: "🔀" },
  CONFIRMAR_DUPLAS: { label: "Confirmou as duplas", alerta: false, emoji: "✅" },
  SALVAR_PLACAR: { label: "Lançou/editou placar", alerta: false, emoji: "🎾" },
  MATA_MATA: { label: "Mexeu no mata-mata", alerta: false, emoji: "🥅" },
  ENCERRAR: { label: "Encerrou a rodada", alerta: false, emoji: "🏁" },
  REABRIR: { label: "REABRIU a rodada", alerta: true, emoji: "⚠️" },
  PESO: { label: "Alterou o peso da rodada", alerta: true, emoji: "✖️" },
};

const dt = (d: Date) =>
  new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function Detalhe({ e }: { e: ActivityEntry }) {
  const d = (e.detail ?? {}) as Record<string, unknown>;
  if (e.action === "SORTEAR" || e.action === "RESORTEAR") {
    const duplas = Array.isArray(d.duplas) ? (d.duplas as string[]) : [];
    return (
      <details className="mt-1">
        <summary className="cursor-pointer text-xs text-ocean">ver {duplas.length} duplas · seed {String(d.seed ?? "").slice(0, 8)}</summary>
        <ul className="mt-1 flex flex-col gap-0.5 pl-3">
          {duplas.map((x, i) => (
            <li key={i} className="text-xs text-muted">• {x}</li>
          ))}
        </ul>
      </details>
    );
  }
  if (e.action === "TROCAR_PARCEIRO") {
    const antes = (d.antes as string[]) ?? [];
    const depois = (d.depois as string[]) ?? [];
    return (
      <p className="mt-1 text-xs text-muted">
        <span className="line-through">{antes.join(" / ")}</span> → <span className="font-semibold text-ink">{depois.join(" / ")}</span>
      </p>
    );
  }
  if (e.action === "SALVAR_PLACAR") {
    return (
      <p className="mt-1 text-xs text-muted">
        {String(d.confronto ?? "")} — {d.fase ? `${d.fase} · ` : ""}
        {d.edicao ? (
          <span>
            editou <span className="line-through">{String(d.placarAntigo)}</span> → <span className="font-semibold text-ink">{String(d.placarNovo)}</span>
          </span>
        ) : (
          <span>placar <span className="font-semibold text-ink">{String(d.placarNovo)}</span></span>
        )}
      </p>
    );
  }
  if (e.action === "PESO") return <p className="mt-1 text-xs text-muted">peso agora {String(d.peso)}</p>;
  return null;
}

export default async function AuditoriaPage() {
  await requireAdmin();
  const log = await getActivityLog({ limit: 300 });

  const resorteios = log.filter((e) => e.action === "RESORTEAR").length;
  const trocas = log.filter((e) => e.action === "TROCAR_PARCEIRO").length;

  return (
    <AppShell title="Auditoria">
      <p className="mb-3 text-xs text-muted">
        Registro de quem fez o quê (sorteio, placar, estado). Ações de atenção aparecem destacadas.
      </p>

      {log.length > 0 && (
        <div className="mb-4 flex gap-2">
          <div className="flex-1 rounded-2xl border border-line bg-card p-3 text-center">
            <p className="text-xl font-black text-warning">{resorteios}</p>
            <p className="text-[11px] text-muted">re-sorteios</p>
          </div>
          <div className="flex-1 rounded-2xl border border-line bg-card p-3 text-center">
            <p className="text-xl font-black text-warning">{trocas}</p>
            <p className="text-[11px] text-muted">trocas manuais</p>
          </div>
          <div className="flex-1 rounded-2xl border border-line bg-card p-3 text-center">
            <p className="text-xl font-black text-ink">{log.length}</p>
            <p className="text-[11px] text-muted">ações no total</p>
          </div>
        </div>
      )}

      {log.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          Nenhuma ação registrada ainda. A partir de agora, todo sorteio, placar e mudança fica registrado aqui.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {log.map((e) => {
            const m = META[e.action] ?? { label: e.action, alerta: false, emoji: "•" };
            return (
              <li
                key={e.id}
                className={`rounded-2xl border p-3 ${m.alerta ? "border-warning/40 bg-warning/10" : "border-line bg-card"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {m.emoji} {m.label}
                      {e.roundNumero != null && <span className="text-muted"> · Rodada {e.roundNumero}</span>}
                    </p>
                    <p className="text-[11px] text-muted">
                      {e.actorName}
                      {e.actorEmail ? ` (${e.actorEmail})` : ""} · {dt(e.createdAt)}
                    </p>
                    <Detalhe e={e} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
