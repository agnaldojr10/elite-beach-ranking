type Ponto = { numero: number; pos: number; total: number };

/** Linha da posição no ranking rodada a rodada (1º no topo). SVG, sem libs. */
export function PositionChart({ serie }: { serie: Ponto[] }) {
  if (serie.length < 2) return null;

  const W = 300;
  const H = 120;
  const padX = 14;
  const padY = 18;
  const maxPos = Math.max(...serie.map((s) => s.pos), 2);
  const n = serie.length;

  const x = (i: number) => padX + (i * (W - 2 * padX)) / (n - 1);
  // pos 1 no topo → menor y; maxPos embaixo
  const y = (pos: number) => padY + ((pos - 1) * (H - 2 * padY)) / Math.max(1, maxPos - 1);

  const pts = serie.map((s, i) => `${x(i)},${y(s.pos)}`).join(" ");
  const areaPath = `M ${x(0)},${H - padY + 8} L ${pts.split(" ").join(" L ")} L ${x(n - 1)},${H - padY + 8} Z`;
  const atual = serie[n - 1];
  const melhor = serie.reduce((b, s) => (s.pos < b.pos ? s : b));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Evolução da posição no ranking">
        <defs>
          <linearGradient id="posArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#posArea)" />
        <polyline
          points={pts}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {serie.map((s, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(s.pos)} r={i === n - 1 ? 4.5 : 3} fill="var(--color-accent)" />
            <text x={x(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--color-muted)">
              {s.numero}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10.5px]">
        <span className="text-muted">
          melhor: <b className="text-ink">{melhor.pos}º</b>
        </span>
        <span className="text-muted">
          atual: <b className="text-accent">{atual.pos}º de {atual.total}</b>
        </span>
      </div>
    </div>
  );
}
