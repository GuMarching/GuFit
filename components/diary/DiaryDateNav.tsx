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

export const DiaryDateNav = (props: { date: string }) => {
  const router = useRouter();

  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [daysBack, setDaysBack] = useState(21);

  const todayIso = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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
      <button
        type="button"
        onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
        className="shrink-0 rounded-2xl border bg-white px-3 py-2 text-sm font-semibold shadow-sm"
        aria-label="เลือกวันที่"
      >
        📅
      </button>

      <input
        ref={dateInputRef}
        type="date"
        value={props.date}
        onChange={(e) => router.push(`/diary?date=${e.target.value}`)}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

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
              onClick={() => router.push(`/diary?date=${iso}`)}
              className={
                selected
                  ? 'min-w-[58px] rounded-full border-2 border-emerald-600 bg-emerald-50 px-3 py-2 text-center shadow-sm'
                  : isToday
                    ? 'min-w-[58px] rounded-full border-2 border-emerald-200 bg-white px-3 py-2 text-center shadow-sm'
                    : 'min-w-[58px] rounded-full border bg-white px-3 py-2 text-center shadow-sm'
              }
            >
              <div className="relative">
                <div className={selected ? 'text-[11px] font-semibold text-emerald-700' : 'text-[11px] font-semibold text-gray-700'}>
                  {wd}
                </div>
                <div className={selected ? 'text-sm font-extrabold text-emerald-700' : 'text-sm font-bold text-gray-900'}>
                  {dd}
                </div>
                {isToday ? (
                  <span
                    className={
                      selected
                        ? 'absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-600'
                        : 'absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-400'
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
