'use client';

import { useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const bangkokTodayIso = (): string => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
};

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
    <path
      d="M8 3v2M16 3v2M4 8h16M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const HeaderRight = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const p = pathname ?? '';
  const isDiary = p === '/diary' || p.startsWith('/diary/');
  const isWeight = p === '/weight' || p.startsWith('/weight/');
  const basePath = isWeight ? '/weight' : '/diary';

  const currentDate = useMemo(() => {
    const d = searchParams?.get('date');
    return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : bangkokTodayIso();
  }, [searchParams]);

  if (!isDiary && !isWeight) return null;

  return (
    <div className="flex items-center gap-2">
      <input
        ref={dateInputRef}
        type="date"
        value={currentDate}
        onChange={(e) => {
          const next = e.target.value;
          const params = new URLSearchParams(searchParams?.toString() ?? '');
          params.set('date', next);
          router.push(`${basePath}?${params.toString()}`);
        }}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      <button
        type="button"
        onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
        className="inline-flex h-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-white active:translate-y-px active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/25"
        aria-label="เลือกวันที่"
      >
        <span className="inline-flex items-center gap-2">
          <CalendarIcon />
          <span className="hidden sm:inline">{currentDate}</span>
        </span>
      </button>
    </div>
  );
};
