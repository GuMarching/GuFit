'use client';

import { useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const bangkokTodayIso = (): string => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
};

export const WeightDatePicker = (props: { date: string }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const currentDate = useMemo(() => props.date || bangkokTodayIso(), [props.date]);

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
          router.push(`/weight?${params.toString()}`);
        }}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
        className="h-9 w-9 rounded-2xl border bg-white text-sm font-semibold shadow-sm"
        aria-label="เลือกวันที่"
      >
        📅
      </button>
    </div>
  );
};
