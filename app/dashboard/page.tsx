import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui';
import DashboardCaloriesBarsClient from '@/components/dashboard/DashboardCaloriesBarsClient';
import { fmt0, fmt1 } from '@/lib/format';
import { calculateBmr, calculateDailyCalorieTarget, calculateTdee } from '@/lib/calculations/metabolism';
import { listFoodLogsByRange } from '@/lib/services/foodService';
import { getUserProfile } from '@/lib/services/userService';
import { listWeightLogs } from '@/lib/services/weightService';
import { todayIsoDate } from '@/db/local/store';
import { getUserIdOrRedirect } from '@/lib/supabase/auth';
import type { IsoDateString } from '@/types/domain';

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

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

export default async function DashboardPage(props: { searchParams?: { range?: string } }) {
  const userId = await getUserIdOrRedirect();
  const profile = await getUserProfile(userId);
  if (!profile) redirect('/profile');

  const date = todayIsoDate();

  const bmr = calculateBmr({
    gender: profile.gender,
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
  });
  const tdee = calculateTdee({ bmr, activityLevel: profile.activityLevel });
  const target = calculateDailyCalorieTarget({ tdee, goalType: profile.goalType });

  const rangeParam = props.searchParams?.range;
  const range: '7' | '30' | 'all' = rangeParam === '30' ? '30' : rangeParam === 'all' ? 'all' : '7';

  const pickDates = (count: number) =>
    Array.from({ length: count }).map((_, i) => addDays(date, i - (count - 1)));
  const rangeDates = range === '7' ? pickDates(7) : range === '30' ? pickDates(30) : null;

  const totalsByDate = new Map<
    string,
    {
      date: string;
      calories: number;
      proteinKcal: number;
      carbsKcal: number;
      fatKcal: number;
      macroKcal: number;
    }
  >();

  const from = (rangeDates ? rangeDates[0] : '2000-01-01') as IsoDateString;
  const to = (rangeDates ? rangeDates[rangeDates.length - 1] : date) as IsoDateString;
  const [rangeLogs, weightLogs] = await Promise.all([
    listFoodLogsByRange({ userId: profile.id, from, to }),
    listWeightLogs({ userId: profile.id }),
  ]);

  for (const l of rangeLogs) {
    const prev =
      totalsByDate.get(l.date) ??
      ({
        date: l.date,
        calories: 0,
        proteinKcal: 0,
        carbsKcal: 0,
        fatKcal: 0,
        macroKcal: 0,
      } satisfies {
        date: string;
        calories: number;
        proteinKcal: number;
        carbsKcal: number;
        fatKcal: number;
        macroKcal: number;
      });

    const proteinKcal = l.protein * 4;
    const carbsKcal = l.carbs * 4;
    const fatKcal = l.fat * 9;
    totalsByDate.set(l.date, {
      date: l.date,
      calories: prev.calories + l.calories,
      proteinKcal: prev.proteinKcal + proteinKcal,
      carbsKcal: prev.carbsKcal + carbsKcal,
      fatKcal: prev.fatKcal + fatKcal,
      macroKcal: prev.macroKcal + (proteinKcal + carbsKcal + fatKcal),
    });
  }

  const foodByDay = (rangeDates
    ? rangeDates.map((d) => totalsByDate.get(d) ?? { date: d, calories: 0, proteinKcal: 0, carbsKcal: 0, fatKcal: 0, macroKcal: 0 })
    : Array.from(totalsByDate.values()).sort((a, b) => (a.date > b.date ? 1 : -1))) as {
    date: string;
    calories: number;
    proteinKcal: number;
    carbsKcal: number;
    fatKcal: number;
    macroKcal: number;
  }[];

  const maxMacroKcal = Math.max(1, ...foodByDay.map((d) => d.macroKcal), target);
  const avgCalories = foodByDay.length > 0 ? foodByDay.reduce((s, x) => s + x.calories, 0) / foodByDay.length : 0;

  const weightAscending = [...weightLogs].sort((a, b) => (a.date > b.date ? 1 : -1));
  const latestWeight = weightAscending.length > 0 ? weightAscending[weightAscending.length - 1]!.weightKg : profile.weightKg;

  const heightM = profile.heightCm / 100;
  const bmi = heightM > 0 ? latestWeight / (heightM * heightM) : 0;
  const bmiMin = 15;
  const bmiMax = 40;
  const bmiPos = clamp((bmi - bmiMin) / (bmiMax - bmiMin), 0, 1);
  const normalMin = 18.5;
  const normalMax = 24.9;
  const normalLeft = clamp((normalMin - bmiMin) / (bmiMax - bmiMin), 0, 1);
  const normalRight = clamp((normalMax - bmiMin) / (bmiMax - bmiMin), 0, 1);
  const bmiLabel =
    bmi < 18.5 ? 'น้ำหนักน้อย' : bmi < 25 ? 'ปกติ' : bmi < 30 ? 'เกิน' : 'อ้วน';

  const rangeProteinKcal = foodByDay.reduce((s, d) => s + d.proteinKcal, 0);
  const rangeCarbsKcal = foodByDay.reduce((s, d) => s + d.carbsKcal, 0);
  const rangeFatKcal = foodByDay.reduce((s, d) => s + d.fatKcal, 0);
  const rangeProteinG = rangeProteinKcal / 4;
  const rangeCarbsG = rangeCarbsKcal / 4;
  const rangeFatG = rangeFatKcal / 9;

  const calorieTicks = [1, 0.75, 0.5, 0.25, 0].map((p) => ({
    p,
    v: Math.round(maxMacroKcal * p),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">วันนี้</h1>
          <div className="text-sm font-semibold text-gray-600">{date}</div>
        </div>
        <div />
      </div>

      <Card title="แคลอรี่">
        <div className="space-y-3">
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/dashboard?range=7`}
              className={
                range === '7'
                  ? 'rounded-full bg-teal-700 px-3 py-2 text-xs font-extrabold text-white shadow-sm'
                  : 'rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-extrabold text-gray-900 shadow-sm'
              }
            >
              7 วัน
            </Link>
            <Link
              href={`/dashboard?range=30`}
              className={
                range === '30'
                  ? 'rounded-full bg-teal-700 px-3 py-2 text-xs font-extrabold text-white shadow-sm'
                  : 'rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-extrabold text-gray-900 shadow-sm'
              }
            >
              30 วัน
            </Link>
            <Link
              href={`/dashboard?range=all`}
              className={
                range === 'all'
                  ? 'rounded-full bg-teal-700 px-3 py-2 text-xs font-extrabold text-white shadow-sm'
                  : 'rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-extrabold text-gray-900 shadow-sm'
              }
            >
              ทั้งหมด
            </Link>
          </div>
          <div className="relative rounded-2xl bg-gray-50 p-3">
            {calorieTicks.map((t) => (
              <div
                key={t.p}
                className="pointer-events-none absolute left-3 right-3 z-0"
                style={{ top: `${8 + (1 - t.p) * 120}px` }}
                aria-hidden="true"
              >
                <div className="absolute -left-0 top-0 -translate-y-1/2 text-[11px] font-semibold text-gray-500">{t.v}</div>
                {t.p === 0 || t.p === 1 ? null : <div className="h-px w-full bg-gray-200" />}
              </div>
            ))}
            <div className="relative z-10">
              <DashboardCaloriesBarsClient
                days={foodByDay.map((d) => {
                  const dt = isoToDate(d.date);
                  const wd = TH_WEEKDAYS_SHORT[dt.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6];
                  const day = String(dt.getDate());
                  return {
                    date: d.date,
                    wd,
                    day,
                    macroKcal: d.macroKcal,
                    proteinKcal: d.proteinKcal,
                    carbsKcal: d.carbsKcal,
                    fatKcal: d.fatKcal,
                  };
                })}
                maxMacroKcal={maxMacroKcal}
                heightPx={120}
              />
            </div>
            <div
              className="pointer-events-none absolute left-3 right-3 z-20 h-[3px] rounded-full bg-teal-700 shadow-[0_1px_0_rgba(255,255,255,0.7)]"
              style={{ top: `${8 + (1 - target / maxMacroKcal) * 120}px` }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute right-3 z-20 text-[11px] font-extrabold text-teal-800"
              style={{ top: `calc(${8 + (1 - target / maxMacroKcal) * 120}px - 16px)` }}
            >
              target
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gray-50 p-3">
              <div className="text-[11px] font-medium text-gray-600">เฉลี่ย {range === 'all' ? 'ทั้งหมด' : `${range} วัน`}</div>
              <div className="mt-1 text-base font-semibold">{fmt0(avgCalories)} kcal</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-3">
              <div className="text-[11px] font-medium text-gray-600">เป้าหมาย/วัน</div>
              <div className="mt-1 text-base font-semibold">{target} kcal</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-gray-50 p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-gray-600">
                <span className="h-2 w-2 rounded-sm bg-teal-600" aria-hidden="true" />
                โปรตีน
              </div>
              <div className="mt-1 text-base font-semibold">{fmt0(rangeProteinG)}g</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-gray-600">
                <span className="h-2 w-2 rounded-sm bg-indigo-500" aria-hidden="true" />
                คาร์บ
              </div>
              <div className="mt-1 text-base font-semibold">{fmt0(rangeCarbsG)}g</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-gray-600">
                <span className="h-2 w-2 rounded-sm bg-amber-300" aria-hidden="true" />
                ไขมัน
              </div>
              <div className="mt-1 text-base font-semibold">{fmt0(rangeFatG)}g</div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="น้ำหนักปัจจุบัน">
        <div className="flex items-baseline justify-between">
          <div className="text-sm font-semibold text-gray-600">ล่าสุด</div>
          <div className="text-3xl font-extrabold tracking-tight text-gray-900">{fmt1(latestWeight)} <span className="text-base font-extrabold text-gray-600">กก.</span></div>
        </div>
      </Card>

      <Card title="BMI">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-sm font-semibold text-gray-900">{fmt1(bmi)}</div>
            <div className="text-xs font-semibold text-gray-700">{bmiLabel}</div>
          </div>
          <div className="relative h-4 w-full overflow-hidden rounded-full">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-400 via-amber-300 to-teal-400" />
            <div
              className="pointer-events-none absolute top-0 h-full rounded-full bg-white/35 ring-1 ring-inset ring-white/60"
              style={{ left: pct(normalLeft), width: pct(Math.max(0, normalRight - normalLeft)) }}
              aria-hidden="true"
            />
            <div
              className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-white bg-gray-900 shadow ring-2 ring-white/70"
              style={{ left: `calc(${(bmiPos * 100).toFixed(2)}% - 12px)` }}
              aria-label="ตำแหน่ง BMI"
            />
            <div
              className="pointer-events-none absolute top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-white/80"
              style={{ left: pct(normalLeft) }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-white/80"
              style={{ left: pct(normalRight) }}
              aria-hidden="true"
            />
          </div>
          <div className="relative flex items-center justify-between text-[11px] font-semibold text-gray-600">
            <span>{bmiMin}</span>
            <span>{bmiMax}</span>
            <span className="pointer-events-none absolute -translate-x-1/2 text-[11px] font-extrabold text-gray-700" style={{ left: pct(normalLeft) }}>
              18.5
            </span>
            <span className="pointer-events-none absolute -translate-x-1/2 text-[11px] font-extrabold text-gray-700" style={{ left: pct(normalRight) }}>
              24.9
            </span>
          </div>
          <div className="text-xs font-semibold text-gray-600">
            ช่วงปกติ: 18.5–24.9
          </div>
        </div>
      </Card>
    </div>
  );
}
