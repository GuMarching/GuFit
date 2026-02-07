'use client';

import { useMemo, useState } from 'react';

import { fmt1 } from '@/lib/format';

type DayBar = {
  date: string;
  wd: string;
  day: string;
  macroKcal: number;
  proteinKcal: number;
  carbsKcal: number;
  fatKcal: number;
};

export default function DashboardCaloriesBarsClient(props: {
  days: DayBar[];
  maxMacroKcal: number;
  heightPx?: number;
}) {
  const height = props.heightPx ?? 120;

  const [active, setActive] = useState<number | null>(null);

  const activeDay = active == null ? null : props.days[active] ?? null;

  const tooltip = useMemo(() => {
    if (!activeDay) return null;

    const total = Math.max(1, activeDay.macroKcal);
    const proteinPct = Math.round((activeDay.proteinKcal / total) * 100);
    const carbsPct = Math.round((activeDay.carbsKcal / total) * 100);
    const fatPct = Math.max(0, 100 - proteinPct - carbsPct);

    return {
      title: `${activeDay.wd} ${activeDay.day}`,
      total: Math.round(activeDay.macroKcal),
      proteinG: fmt1(activeDay.proteinKcal / 4),
      carbsG: fmt1(activeDay.carbsKcal / 4),
      fatG: fmt1(activeDay.fatKcal / 9),
      proteinPct,
      carbsPct,
      fatPct,
    };
  }, [activeDay]);

  return (
    <div className="relative">
      {tooltip ? (
        <div className="pointer-events-none absolute -top-3 left-1/2 z-30 w-[260px] -translate-x-1/2 -translate-y-full rounded-3xl border border-gray-100 bg-white/95 p-3 text-sm shadow-xl backdrop-blur">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-xs font-extrabold text-gray-900">{tooltip.title}</div>
            <div className="text-xs font-extrabold text-gray-700">{tooltip.total} kcal</div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-2xl border border-gray-100 bg-gray-50/80 px-2 py-2">
              <div className="font-extrabold text-gray-900">โปรตีน</div>
              <div className="mt-0.5 font-semibold text-gray-700">{tooltip.proteinG}g</div>
              <div className="text-gray-500">{tooltip.proteinPct}%</div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50/80 px-2 py-2">
              <div className="font-extrabold text-gray-900">คาร์บ</div>
              <div className="mt-0.5 font-semibold text-gray-700">{tooltip.carbsG}g</div>
              <div className="text-gray-500">{tooltip.carbsPct}%</div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50/80 px-2 py-2">
              <div className="font-extrabold text-gray-900">ไขมัน</div>
              <div className="mt-0.5 font-semibold text-gray-700">{tooltip.fatG}g</div>
              <div className="text-gray-500">{tooltip.fatPct}%</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-end justify-between gap-2 overflow-x-auto pb-1">
        {props.days.map((d, idx) => {
          const hasData = d.macroKcal > 0;
          const h = hasData ? Math.max(2, Math.round((d.macroKcal / props.maxMacroKcal) * height)) : 0;
          const total = hasData ? d.macroKcal : 1;
          const carbsH = hasData ? Math.round((d.carbsKcal / total) * h) : 0;
          const proteinH = hasData ? Math.round((d.proteinKcal / total) * h) : 0;
          const fatH = hasData ? Math.max(0, h - carbsH - proteinH) : 0;

          const isActive = idx === active;

          return (
            <button
              key={d.date}
              type="button"
              onMouseEnter={() => setActive(idx)}
              onMouseLeave={() => setActive((v) => (v === idx ? null : v))}
              onFocus={() => setActive(idx)}
              onBlur={() => setActive((v) => (v === idx ? null : v))}
              onClick={() => setActive((v) => (v === idx ? null : idx))}
              className="flex w-full min-w-[34px] flex-col items-center gap-2 focus-visible:outline-none"
              aria-label={`${d.date}`}
            >
              <div className="w-full max-w-[34px]">
                <div
                  className={
                    isActive
                      ? 'flex h-[120px] w-full flex-col justify-end rounded-xl bg-white/50 ring-2 ring-teal-600/25'
                      : 'flex h-[120px] w-full flex-col justify-end bg-white/0'
                  }
                >
                  {hasData ? (
                    <>
                      <div className="w-full rounded-t-md bg-amber-300/85 ring-1 ring-inset ring-black/5" style={{ height: fatH }} />
                      <div className="w-full bg-teal-600/85 ring-1 ring-inset ring-black/5" style={{ height: proteinH }} />
                      <div className="w-full rounded-b-md bg-indigo-500/85 ring-1 ring-inset ring-black/5" style={{ height: carbsH }} />
                    </>
                  ) : (
                    <div className="h-2 w-full rounded bg-gray-200" />
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[11px] font-semibold text-gray-700">{d.wd}</div>
                <div className="text-[11px] font-semibold text-gray-500">{d.day}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
