'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { Pill } from '@/components/ui';

export default function DashboardHeaderWeightLossDays() {
  const pathname = usePathname();
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    if (pathname !== '/dashboard') {
      setDays(null);
      return;
    }

    let cancelled = false;

    fetch('/api/dashboard/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        if (cancelled) return;
        const d = (data as { weightLossDays?: unknown } | null)?.weightLossDays;
        setDays(typeof d === 'number' && Number.isFinite(d) ? d : 0);
      })
      .catch(() => {
        if (cancelled) return;
        setDays(0);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (pathname !== '/dashboard') return null;
  if (days == null) return null;

  return <Pill tone="muted">ลดน้ำหนักมาแล้ว {days} วัน</Pill>;
}
