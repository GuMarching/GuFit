'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const todayIsoBangkok = (): string => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
};

export default function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    const date = todayIsoBangkok();
    const urls = ['/dashboard', `/diary?date=${date}`, `/weight?date=${date}`, '/profile'];

    const run = () => {
      for (const u of urls) router.prefetch(u);
    };

    const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number };

    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(run, { timeout: 1500 });
      return;
    }

    const t = window.setTimeout(run, 350);
    return () => window.clearTimeout(t);
  }, [router]);

  return null;
}
