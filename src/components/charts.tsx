/**
 * Dependency-free SVG charts used across dashboards and the statistics
 * page (SRS §8.2). All are server-renderable.
 */

const PALETTE = [
  "#576139", // olive (accent)
  "#886620", // gold
  "#884820", // rust
  "#486830", // sage
  "#3b6b88", // sky
  "#7a667a", // violet
  "#a0733a", // warm brown
  "#a85070", // muted rose
  "#686c55", // slate-600
];

export interface ChartDatum {
  label: string;
  value: number;
  color?: string;
}

/* ------------------------------------------------------------------ */
/* Donut chart                                                         */
/* ------------------------------------------------------------------ */

export function DonutChart({
  data,
  size = 180,
  thickness = 26,
  centreLabel,
}: {
  data: ChartDatum[];
  size?: number;
  thickness?: number;
  centreLabel?: string;
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const dashes = data.map((d) => (d.value / total) * c);
  const offsets = dashes.map((_, i) =>
    dashes.slice(0, i).reduce((acc, dash) => acc + dash, 0)
  );

  return (
    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto w-full max-w-[180px] shrink-0"
        role="img"
        aria-label={centreLabel ?? "Donut chart"}
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((d, i) => {
            const dash = dashes[i];
            return (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color ?? PALETTE[i % PALETTE.length]}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offsets[i]}
              />
            );
          })}
        </g>
        <text
          x="50%"
          y="47%"
          textAnchor="middle"
          className="fill-slate-900 text-xl font-bold"
        >
          {total.toLocaleString()}
        </text>
        {centreLabel ? (
          <text
            x="50%"
            y="58%"
            textAnchor="middle"
            className="fill-slate-400 text-[10px] font-medium uppercase tracking-wide"
          >
            {centreLabel}
          </text>
        ) : null}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: d.color ?? PALETTE[i % PALETTE.length] }}
            />
            <span className="min-w-0 truncate text-slate-600">{d.label}</span>
            <span className="ml-auto pl-4 font-semibold tabular-nums text-slate-800">
              {d.value.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Horizontal bar list                                                 */
/* ------------------------------------------------------------------ */

export function BarList({ data }: { data: ChartDatum[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.label}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="font-medium text-slate-700">{d.label}</span>
            <span className="font-semibold tabular-nums text-slate-900">
              {d.value.toLocaleString()}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: d.color ?? PALETTE[i % PALETTE.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Vertical column chart (e.g. weekly throughput)                      */
/* ------------------------------------------------------------------ */

export function ColumnChart({
  data,
  height = 140,
  color = "#576139",
}: {
  data: ChartDatum[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => (
        <div
          key={d.label}
          className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
        >
          <span className="text-[10px] font-semibold tabular-nums text-slate-500 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
            {d.value}
          </span>
          <div
            className="w-full rounded-t-md transition group-hover:opacity-80"
            style={{
              height: `${Math.max((d.value / max) * 100, 2)}%`,
              background: d.color ?? color,
            }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="truncate text-[10px] text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pipeline funnel (Architect dashboard, SRS §7.1.1 ③)                 */
/* ------------------------------------------------------------------ */

export function FunnelChart({ data }: { data: ChartDatum[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-2 sm:gap-3">
          <span className="w-20 shrink-0 truncate text-right text-[11px] font-medium text-slate-500 sm:w-36 sm:text-xs">
            {d.label}
          </span>
          <div className="flex h-8 min-w-0 flex-1 items-center sm:h-9">
            <div
              className="flex h-full min-w-[2.5rem] items-center justify-end rounded-r-lg pr-2 text-[11px] font-bold text-white sm:text-xs"
              style={{
                width: `${Math.max((d.value / max) * 100, 6)}%`,
                background: d.color ?? PALETTE[i % PALETTE.length],
              }}
              title={`${d.label}: ${d.value}`}
            >
              {d.value.toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
