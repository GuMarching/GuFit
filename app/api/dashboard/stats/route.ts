import { NextResponse } from 'next/server';

import { getUserIdOrRedirect } from '@/lib/supabase/auth';
import { listWeightLogs } from '@/lib/services/weightService';

export async function GET() {
  const userId = await getUserIdOrRedirect();
  const logs = await listWeightLogs({ userId });
  const ascending = [...logs].sort((a, b) => (a.date > b.date ? 1 : -1));

  const weightLossDays = (() => {
    if (ascending.length < 2) return 0;
    const desc = [...ascending].sort((a, b) => (a.date > b.date ? -1 : 1));
    let days = 0;
    for (let i = 0; i < desc.length - 1; i++) {
      const newer = desc[i];
      const older = desc[i + 1];
      if (!newer || !older) break;
      if (newer.weightKg < older.weightKg) {
        days += 1;
      } else {
        break;
      }
    }
    return days;
  })();

  return NextResponse.json({ weightLossDays });
}
