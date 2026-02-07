'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const addDays = (iso: string, days: number): string => {
  const parts = iso.split('-');
  const y = Number(parts[0] ?? '0');
  const m = Number(parts[1] ?? '1');
  const d = Number(parts[2] ?? '1');
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const isoToDate = (iso: string): Date => {
  const parts = iso.split('-');
  const y = Number(parts[0] ?? '0');
  const m = Number(parts[1] ?? '1');
  const d = Number(parts[2] ?? '1');
  return new Date(y, m - 1, d);
};

const TH_WEEKDAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] as const;

type DayStatus = {
  date: string;
  hasData: boolean;
  left: number;
  net: number;
};

export const DiaryDateNav = (props: { date: string; basePath?: string }) => {
  const router = useRouter();
  const basePath = props.basePath ?? '/diary';

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [daysBack, setDaysBack] = useState(21);
  const [statusByDate, setStatusByDate] = useState<Record<string, DayStatus>>({});

  const todayIso = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return fmt.format(new Date());
  }, []);

  useEffect(() => {
    const startIso = addDays(todayIso, -daysBack);
    if (props.date < startIso) {
      const start = isoToDate(startIso).getTime();
      const selected = isoToDate(props.date).getTime();
      const diffDays = Math.ceil((start - selected) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) setDaysBack((v) => v + diffDays + 7);
    }
  }, [props.date, todayIso, daysBack]);

  const days = useMemo(() => {
    return Array.from({ length: daysBack + 1 }).map((_, i) => addDays(todayIso, i - daysBack));
  }, [todayIso, daysBack]);

  useEffect(() => {
    if (days.length === 0) return;
    const from = days[0]!;
    const to = days[days.length - 1]!;

    const ac = new AbortController();
    const run = async () => {
      try {
        const res = await fetch(`/api/diary/day-status?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          { signal: ac.signal },
        );
        const data: unknown = await res.json();
        const rec = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
        const list = Array.isArray(rec?.days) ? (rec!.days as DayStatus[]) : [];
        const next: Record<string, DayStatus> = {};
        for (const d of list) {
          if (!d || typeof d !== 'object') continue;
          if (typeof d.date !== 'string') continue;
          next[d.date] = d;
        }
        setStatusByDate((prev) => ({ ...prev, ...next }));
      } catch {
        // ignore
      }
    };
    run();

    return () => ac.abort();
  }, [days]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // Ensure we start near today (right end).
    el.scrollLeft = el.scrollWidth;
  }, [daysBack]);

  useEffect(() => {
    const prev = addDays(props.date, -1);
    const next = addDays(props.date, 1);
    router.prefetch(`${basePath}?date=${prev}`);
    router.prefetch(`${basePath}?date=${next}`);
  }, [router, basePath, props.date]);

  const loadMoreLeft = () => {
    const el = scrollerRef.current;
    if (!el) {
      setDaysBack((v) => v + 14);
      return;
    }
    const prevScrollWidth = el.scrollWidth;
    const prevScrollLeft = el.scrollLeft;
    setDaysBack((v) => v + 14);
    requestAnimationFrame(() => {
      const nextEl = scrollerRef.current;
      if (!nextEl) return;
      const nextScrollWidth = nextEl.scrollWidth;
      nextEl.scrollLeft = prevScrollLeft + (nextScrollWidth - prevScrollWidth);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div
        ref={scrollerRef}
        className="flex flex-1 gap-2 overflow-x-auto pb-2"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollLeft < 40) loadMoreLeft();
        }}
      >
        {days.map((iso) => {
          const dt = isoToDate(iso);
          const wd = TH_WEEKDAYS_SHORT[dt.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6];
          const dd = String(dt.getDate());
          const selected = iso === props.date;
          const isToday = iso === todayIso;
          const st = statusByDate[iso];
          const hasData = Boolean(st?.hasData);
          const over = hasData ? (st?.left ?? 0) < 0 : false;

          const baseCls =
            'min-w-[56px] rounded-2xl border px-3 py-2 text-center shadow-sm transition active:translate-y-px active:scale-[0.99]';

          const cls = selected
            ? `${baseCls} border-2 border-teal-700 bg-teal-50`
            : isToday
              ? `${baseCls} border-slate-300 bg-slate-100`
              : hasData
                ? over
                  ? `${baseCls} border-rose-200 bg-rose-50`
                  : `${baseCls} border-emerald-200 bg-emerald-50`
                : `${baseCls} border-gray-200 bg-white hover:bg-gray-50`;

          const wdCls = selected
            ? 'text-[11px] font-semibold text-teal-800'
            : isToday
              ? 'text-[11px] font-semibold text-slate-700'
              : hasData
                ? over
                  ? 'text-[11px] font-semibold text-rose-800'
                  : 'text-[11px] font-semibold text-emerald-800'
                : 'text-[11px] font-semibold text-gray-700';

          const ddCls = selected
            ? 'text-sm font-extrabold text-teal-900'
            : isToday
              ? 'text-sm font-extrabold text-slate-900'
              : hasData
                ? over
                  ? 'text-sm font-extrabold text-rose-900'
                  : 'text-sm font-extrabold text-emerald-900'
                : 'text-sm font-extrabold text-gray-900';

          return (
            <button
              key={iso}
              type="button"
              onClick={() => router.push(`${basePath}?date=${iso}`)}
              onMouseEnter={() => router.prefetch(`${basePath}?date=${iso}`)}
              onTouchStart={() => router.prefetch(`${basePath}?date=${iso}`)}
              className={cls}
            >
              <div className="relative">
                <div className={wdCls}>{wd}</div>
                <div className={ddCls}>{dd}</div>
                {isToday ? (
                  <span
                    className={
                      selected
                        ? 'absolute -right-1 -top-1 h-2 w-2 rounded-full bg-teal-700'
                        : 'absolute -right-1 -top-1 h-2 w-2 rounded-full bg-slate-500'
                    }
                    aria-label="วันนี้"
                  />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
