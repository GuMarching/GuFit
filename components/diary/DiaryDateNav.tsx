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

export const DiaryDateNav = (props: { date: string; basePath?: string }) => {
  const router = useRouter();
  const basePath = props.basePath ?? '/diary';

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [daysBack, setDaysBack] = useState(21);

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
          return (
            <button
              key={iso}
              type="button"
              onClick={() => router.push(`${basePath}?date=${iso}`)}
              onMouseEnter={() => router.prefetch(`${basePath}?date=${iso}`)}
              onTouchStart={() => router.prefetch(`${basePath}?date=${iso}`)}
              className={
                selected
                  ? 'min-w-[56px] rounded-full border-2 border-teal-700 bg-teal-50 px-3 py-2 text-center shadow-sm transition active:translate-y-px active:scale-[0.99]'
                  : isToday
                    ? 'min-w-[56px] rounded-full border-2 border-teal-200 bg-white px-3 py-2 text-center shadow-sm transition active:translate-y-px active:scale-[0.99]'
                    : 'min-w-[56px] rounded-full border border-gray-200 bg-white px-3 py-2 text-center shadow-sm transition hover:bg-gray-50 active:translate-y-px active:scale-[0.99]'
              }
            >
              <div className="relative">
                <div className={selected ? 'text-[11px] font-semibold text-teal-800' : 'text-[11px] font-semibold text-gray-700'}>
                  {wd}
                </div>
                <div className={selected ? 'text-sm font-extrabold text-teal-900' : 'text-sm font-extrabold text-gray-900'}>
                  {dd}
                </div>
                {isToday ? (
                  <span
                    className={
                      selected
                        ? 'absolute -right-1 -top-1 h-2 w-2 rounded-full bg-teal-700'
                        : 'absolute -right-1 -top-1 h-2 w-2 rounded-full bg-teal-400'
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
