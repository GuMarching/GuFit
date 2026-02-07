import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import type { IsoDateString } from '@/types/domain';
import { getUserIdOrRedirect } from '@/lib/supabase/auth';
import { isSupabaseEnabled } from '@/lib/supabase/client';
import { createSupabaseServerClientReadonly } from '@/lib/supabase/server';
import { readLocalDb } from '@/db/local/store';
import { getUserProfile } from '@/lib/services/userService';
import { calculateBmr, calculateDailyCalorieTarget, calculateTdee } from '@/lib/calculations/metabolism';

const isIsoDate = (v: string | null): v is IsoDateString => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

type DayStatus = {
  date: IsoDateString;
  hasData: boolean;
  left: number;
  net: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!isIsoDate(from) || !isIsoDate(to)) {
    return NextResponse.json({ error: 'Invalid from/to' }, { status: 400 });
  }

  const userId = await getUserIdOrRedirect();
  const profile = await getUserProfile(userId);
  if (!profile) {
    return NextResponse.json({ error: 'Missing profile' }, { status: 400 });
  }

  const bmr = calculateBmr({
    gender: profile.gender,
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
  });
  const tdee = calculateTdee({ bmr, activityLevel: profile.activityLevel });
  const target = calculateDailyCalorieTarget({ tdee, goalType: profile.goalType });

  const totals = new Map<string, { food: number; exercise: number }>();

  if (isSupabaseEnabled()) {
    const cookieStore = await cookies();
    const sb = createSupabaseServerClientReadonly({
      getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
    });

    const foodRes = await sb
      .from('food_logs')
      .select('date, calories')
      .eq('user_id', userId)
      .gte('date', from)
      .lte('date', to);
    if (foodRes.error) return NextResponse.json({ error: foodRes.error.message }, { status: 500 });

    for (const row of foodRes.data ?? []) {
      const d = String((row as { date?: unknown }).date ?? '');
      const c = Number((row as { calories?: unknown }).calories ?? 0);
      if (!totals.has(d)) totals.set(d, { food: 0, exercise: 0 });
      totals.get(d)!.food += Number.isFinite(c) ? c : 0;
    }

    const exRes = await sb
      .from('exercise_logs')
      .select('date, calories_burned')
      .eq('user_id', userId)
      .gte('date', from)
      .lte('date', to);
    if (exRes.error) return NextResponse.json({ error: exRes.error.message }, { status: 500 });

    for (const row of exRes.data ?? []) {
      const d = String((row as { date?: unknown }).date ?? '');
      const c = Number((row as { calories_burned?: unknown }).calories_burned ?? 0);
      if (!totals.has(d)) totals.set(d, { food: 0, exercise: 0 });
      totals.get(d)!.exercise += Number.isFinite(c) ? c : 0;
    }
  } else {
    const db = await readLocalDb();

    for (const l of db.foodLogs) {
      if (l.userId !== userId) continue;
      if (l.date < from || l.date > to) continue;
      if (!totals.has(l.date)) totals.set(l.date, { food: 0, exercise: 0 });
      totals.get(l.date)!.food += l.calories;
    }

    for (const l of db.exerciseLogs) {
      if (l.userId !== userId) continue;
      if (l.date < from || l.date > to) continue;
      if (!totals.has(l.date)) totals.set(l.date, { food: 0, exercise: 0 });
      totals.get(l.date)!.exercise += l.caloriesBurned;
    }
  }

  const out: DayStatus[] = [];
  for (const [date, t] of totals) {
    const net = t.food - t.exercise;
    const left = target - net;
    out.push({ date: date as IsoDateString, hasData: (t.food > 0 || t.exercise > 0), net, left });
  }

  out.sort((a, b) => (a.date > b.date ? 1 : -1));

  return NextResponse.json({ target, from, to, days: out });
}
