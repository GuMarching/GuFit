import { NextResponse } from 'next/server';

import { getUserIdOrRedirect } from '@/lib/supabase/auth';
import { getUserProfile } from '@/lib/services/userService';
import { todayIsoDate } from '@/db/local/store';

const isoToUtcMidnightMs = (iso: string): number => {
  const parts = iso.split('-');
  const y = Number(parts[0] ?? '0');
  const m = Number(parts[1] ?? '1');
  const d = Number(parts[2] ?? '1');
  return Date.UTC(y, m - 1, d);
};

export async function GET() {
  const userId = await getUserIdOrRedirect();
  const profile = await getUserProfile(userId);

  const weightLossDays = (() => {
    const start = profile?.startDate;
    if (!start) return 0;
    const today = todayIsoDate();
    const diffMs = isoToUtcMidnightMs(today) - isoToUtcMidnightMs(start);
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    return Number.isFinite(diffDays) ? Math.max(0, diffDays) : 0;
  })();

  return NextResponse.json({ weightLossDays });
}
