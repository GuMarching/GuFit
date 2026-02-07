import { fmt1 } from '@/lib/format';

const isoToDate = (iso: string): Date => {
  const parts = iso.split('-');
  const y = Number(parts[0] ?? '0');
  const m = Number(parts[1] ?? '1');
  const d = Number(parts[2] ?? '1');
  return new Date(y, m - 1, d);
};

const TH_WEEKDAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] as const;

export default function WeightLineChart(props: {
  points: { date: string; weightKg: number }[];
  heightPx?: number;
}) {
  const h = props.heightPx ?? 170;
  const w = 360;

  const points = props.points.filter((p) => Number.isFinite(p.weightKg));
  if (points.length < 2) return null;

  const pad = { top: 14, right: 44, bottom: 34, left: 12 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const values = points.map((p) => p.weightKg);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);

  const chartMin = Math.floor((minV - 0.2) * 2) / 2;
  const chartMax = Math.ceil((maxV + 0.2) * 2) / 2;
  const chartRange = Math.max(0.5, chartMax - chartMin);

  const toX = (i: number) => pad.left + (i / (points.length - 1)) * innerW;
  const toY = (v: number) => pad.top + innerH - ((v - chartMin) / chartRange) * innerH;

  const d = points
    .map((p, i) => {
      const x = toX(i);
      const y = toY(p.weightKg);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  const last = points[points.length - 1]!;
  const lastX = toX(points.length - 1);
  const lastY = toY(last.weightKg);

  const grid = [1, 0.75, 0.5, 0.25, 0].map((p) => {
    const v = chartMin + chartRange * p;
    const y = pad.top + (1 - p) * innerH;
    return { p, v, y };
  });

  const labelEvery = points.length <= 7 ? 1 : points.length <= 14 ? 2 : points.length <= 30 ? 5 : 10;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-gradient-to-b from-gray-50 to-white p-3 shadow-sm">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} aria-hidden>
        <defs>
          <linearGradient id="w-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#14b8a6" stopOpacity="0.18" />
            <stop offset="1" stopColor="#14b8a6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {grid.map((t) => (
          <g key={t.p}>
            <line x1={pad.left} x2={w - pad.right} y1={t.y} y2={t.y} stroke="#e5e7eb" strokeWidth={1} />
            <text x={w - 6} y={t.y + 4} textAnchor="end" fontSize={11} fill="#6b7280" fontWeight={600}>
              {fmt1(t.v)}
            </text>
          </g>
        ))}

        <path
          d={`${d} L ${lastX.toFixed(2)} ${(pad.top + innerH).toFixed(2)} L ${toX(0).toFixed(2)} ${(pad.top + innerH).toFixed(2)} Z`}
          fill="url(#w-fill)"
        />

        <path d={d} fill="none" stroke="#0f766e" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.18} />
        <path d={d} fill="none" stroke="#0f766e" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

        <circle cx={lastX} cy={lastY} r={8} fill="#ffffff" opacity={0.95} />
        <circle cx={lastX} cy={lastY} r={5} fill="#0f766e" />

        {points.map((p, i) => {
          if (i % labelEvery !== 0 && i !== points.length - 1) return null;
          const dt = isoToDate(p.date);
          const wd = TH_WEEKDAYS_SHORT[dt.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6];
          const day = String(dt.getDate());
          const x = toX(i);
          return (
            <g key={p.date}>
              <text x={x} y={h - 16} textAnchor="middle" fontSize={11} fill="#374151" fontWeight={600}>
                {wd}
              </text>
              <text x={x} y={h - 4} textAnchor="middle" fontSize={11} fill="#6b7280" fontWeight={600}>
                {day}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex items-baseline justify-between">
        <div className="text-[11px] font-semibold text-gray-600">ช่วง</div>
        <div className="text-sm font-extrabold text-gray-900">{fmt1(last.weightKg)} กก.</div>
      </div>
      <div className="text-[11px] font-semibold text-gray-500">{points[0]!.date} – {points[points.length - 1]!.date}</div>
    </div>
  );
}
