import Link from "next/link";
import type { ReactNode } from "react";
import { PlayerIcon } from "./PlayerShell";

export const initials = (nome: string) => {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
};

export function Avatar({
  nome,
  foto,
  size = 36,
  ring = false,
}: {
  nome: string;
  foto?: string | null;
  size?: number;
  ring?: boolean;
}) {
  const cls = `flex shrink-0 items-center justify-center rounded-full ${ring ? "ring-2 ring-accent/50" : ""}`;
  return foto ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={foto} alt={nome} className={`${cls} object-cover`} style={{ width: size, height: size }} />
  ) : (
    <span className={`${cls} bg-ocean/15 font-bold text-ocean`} style={{ width: size, height: size, fontSize: size * 0.3 }}>
      {initials(nome)}
    </span>
  );
}

export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "ocean" }) {
  const cls = { neutral: "bg-white/7 text-ink", accent: "bg-accent/15 text-accent", ocean: "bg-ocean/15 text-ocean" }[tone];
  return <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${cls}`}>{children}</span>;
}

const STATUS = {
  ABERTA: { label: "Aberta", cls: "bg-ocean/15 text-ocean" },
  SORTEADA: { label: "Sorteada", cls: "bg-warning/15 text-warning" },
  ENCERRADA: { label: "Encerrada", cls: "bg-success/15 text-success" },
  AGENDADA: { label: "Especial", cls: "bg-accent/15 text-accent" },
} as const;

export function StatusChip({ status }: { status: keyof typeof STATUS }) {
  const st = STATUS[status] ?? STATUS.ABERTA;
  return <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${st.cls}`}>{st.label}</span>;
}

export function LiveDot() {
  return (
    <span className="relative block h-2 w-2 shrink-0">
      <span className="absolute inset-0 animate-[livePulse_1.6s_ease-in-out_infinite] rounded-full bg-danger" />
      <span className="absolute inset-0 animate-[liveRing_1.8s_ease-out_infinite] rounded-full border border-danger" />
    </span>
  );
}

export function PlayerCard({
  nome,
  clube,
  foto,
  posicao,
  variacao,
  pontos,
  rodadas,
  vitorias,
}: {
  nome: string;
  clube: string | null;
  foto?: string | null;
  posicao: number | null;
  variacao: "up" | "down" | "same";
  pontos: number;
  rodadas: number;
  vitorias: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-line bg-card bg-[linear-gradient(150deg,#143a42,#123239_62%)] p-[18px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.svg" alt="" className="pointer-events-none absolute -bottom-12 -right-10 h-[170px] w-[170px] opacity-[.07]" />
      <div className="relative flex items-center gap-3.5">
        <Avatar nome={nome} foto={foto} size={62} ring />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-extrabold leading-tight text-ink">{nome}</p>
          <p className="mt-0.5 text-[11.5px] text-muted">{clube ?? "Elite Beach"}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[34px] font-black leading-none tracking-[-.03em] text-accent">
            {posicao ? `#${posicao}` : "—"}
          </p>
          {posicao == null ? (
            <p className="mt-1 text-[10.5px] text-muted">sem posição</p>
          ) : variacao !== "same" ? (
            <p className={`mt-1 text-[13px] font-extrabold ${variacao === "up" ? "text-success" : "text-danger"}`}>
              {variacao === "up" ? "▲" : "▼"}
            </p>
          ) : null}
        </div>
      </div>
      <div className="relative mt-4 flex gap-2">
        {[
          ["PONTOS", pontos.toLocaleString("pt-BR")],
          ["RODADAS", rodadas],
          ["VITÓRIAS", vitorias],
        ].map(([label, val]) => (
          <div key={String(label)} className="flex-1 rounded-2xl bg-white/[.04] px-3 py-2.5">
            <p className="text-[9.5px] tracking-[.09em] text-muted">{label}</p>
            <p className="mt-0.5 text-[15px] font-extrabold text-ink">{val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Card AO VIVO — durante a rodada sorteada, o jogo atual do atleta. */
export function LiveMatchCard({
  minhaDupla,
  adversarios,
  rodada,
  grupo,
  href = "/jogo-agora",
}: {
  minhaDupla: string;
  adversarios: string;
  rodada: number;
  grupo: string | null;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-3xl border border-accent bg-[linear-gradient(160deg,rgba(255,122,26,.18),rgba(255,122,26,.06))] px-4 py-3.5"
    >
      <div className="flex items-center gap-2">
        <LiveDot />
        <span className="text-[10.5px] font-extrabold tracking-[.14em] text-accent">AO VIVO · SEU JOGO AGORA</span>
        <span className="flex-1" />
        <span className="text-accent">
          <PlayerIcon size={17}>
            <path d="M9 5l7 7-7 7" />
          </PlayerIcon>
        </span>
      </div>
      <div className="mt-2.5">
        <p className="text-[13.5px] font-extrabold text-ink">{minhaDupla}</p>
        <p className="mt-0.5 text-[11.5px] font-medium text-muted">vs {adversarios}</p>
      </div>
      <div className="mt-2.5 flex gap-1.5">
        <Chip>Rodada {rodada}</Chip>
        {grupo && <Chip>Grupo {grupo}</Chip>}
      </div>
    </Link>
  );
}

export function PillButton({
  href,
  variant = "primary",
  children,
}: {
  href: string;
  variant?: "primary" | "soft" | "outline";
  children: ReactNode;
}) {
  const v = {
    primary: "bg-accent text-accent-ink",
    soft: "bg-accent/15 text-accent",
    outline: "border border-line text-ink",
  }[variant];
  return (
    <Link href={href} className={`block rounded-full px-4 py-3.5 text-center text-[14px] font-extrabold ${v}`}>
      {children}
    </Link>
  );
}
