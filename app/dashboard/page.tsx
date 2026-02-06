import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui';
import { calculateBmr, calculateDailyCalorieTarget, calculateTdee } from '@/lib/calculations/metabolism';
import { listFoodLogsByDate } from '@/lib/services/foodService';
import { getUserProfile } from '@/lib/services/userService';
import { listWeightLogs } from '@/lib/services/weightService';
import { todayIsoDate } from '@/db/local/store';
import { Sparkline } from '@/components/sparkline';
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

  const datesToFetch = rangeDates ?? [date];
  await Promise.all(
    datesToFetch.map(async (d) => {
      const logs = await listFoodLogsByDate({ userId: profile.id, date: d as IsoDateString });
      const proteinG = logs.reduce((s, l) => s + l.protein, 0);
      const fatG = logs.reduce((s, l) => s + l.fat, 0);
      const carbsG = logs.reduce((s, l) => s + l.carbs, 0);
      const calories = logs.reduce((s, l) => s + l.calories, 0);

      const proteinKcal = proteinG * 4;
      const carbsKcal = carbsG * 4;
      const fatKcal = fatG * 9;
      const macroKcal = proteinKcal + carbsKcal + fatKcal;

      totalsByDate.set(d, {
        date: d,
        calories,
        proteinKcal,
        carbsKcal,
        fatKcal,
        macroKcal,
      });
    }),
  );

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

  const weightLogs = await listWeightLogs({ userId: profile.id });
  const weightAscending = [...weightLogs].sort((a, b) => (a.date > b.date ? 1 : -1));
  const weightLast30 = weightAscending.slice(Math.max(0, weightAscending.length - 30));
  const weightValues = weightLast30.map((l) => l.weightKg);
  const latestWeight = weightAscending.length > 0 ? weightAscending[weightAscending.length - 1]!.weightKg : profile.weightKg;
  const weightMin = weightValues.length > 0 ? Math.min(...weightValues) : 0;
  const weightMax = weightValues.length > 0 ? Math.max(...weightValues) : 0;
  const weightFromDate = weightLast30.length > 0 ? weightLast30[0]!.date : null;
  const weightToDate = weightLast30.length > 0 ? weightLast30[weightLast30.length - 1]!.date : null;

  const weightChartMin = weightValues.length > 0 ? Math.floor((weightMin - 0.1) * 2) / 2 : 0;
  const weightChartMax = weightValues.length > 0 ? Math.ceil((weightMax + 0.1) * 2) / 2 : 0;
  const weightTicks = [1, 0.75, 0.5, 0.25, 0].map((p) => ({
    p,
    v: weightChartMin + (weightChartMax - weightChartMin) * p,
  }));

  const heightM = profile.heightCm / 100;
  const bmi = heightM > 0 ? latestWeight / (heightM * heightM) : 0;
  const bmiMin = 15;
  const bmiMax = 40;
  const bmiPos = clamp((bmi - bmiMin) / (bmiMax - bmiMin), 0, 1);
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">วันนี้</h1>
          <div className="text-xs text-gray-600">{date}</div>
        </div>
        <div />
      </div>

      <Card title="แคลอรี่">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard?range=7`}
              className={
                range === '7'
                  ? 'rounded-full border border-emerald-600 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'
                  : 'rounded-full border bg-white px-3 py-1 text-xs font-semibold text-gray-700'
              }
            >
              7 วัน
            </Link>
            <Link
              href={`/dashboard?range=30`}
              className={
                range === '30'
                  ? 'rounded-full border border-emerald-600 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'
                  : 'rounded-full border bg-white px-3 py-1 text-xs font-semibold text-gray-700'
              }
            >
              30 วัน
            </Link>
            <Link
              href={`/dashboard?range=all`}
              className={
                range === 'all'
                  ? 'rounded-full border border-emerald-600 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700'
                  : 'rounded-full border bg-white px-3 py-1 text-xs font-semibold text-gray-700'
              }
            >
              ทั้งหมด
            </Link>
          </div>

          <div className="relative rounded-2xl bg-gray-50 p-3">
            {calorieTicks.map((t) => (
              <div
                key={t.p}
                className="pointer-events-none absolute left-3 right-3"
                style={{ top: `${8 + (1 - t.p) * 120}px` }}
                aria-hidden="true"
              >
                <div className="absolute -left-0 top-0 -translate-y-1/2 text-[11px] font-semibold text-gray-500">{t.v}</div>
                {t.p === 0 || t.p === 1 ? null : <div className="h-px w-full bg-gray-200" />}
              </div>
            ))}
            <div
              className="pointer-events-none absolute left-3 right-3 h-[2px] rounded-full bg-emerald-600/60"
              style={{ top: `${8 + (1 - target / maxMacroKcal) * 120}px` }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute right-3 text-[11px] font-semibold text-emerald-700"
              style={{ top: `calc(${8 + (1 - target / maxMacroKcal) * 120}px - 14px)` }}
            >
              target
            </div>
            <div className="flex items-end justify-between gap-2 overflow-x-auto pb-1">
              {foodByDay.map((d) => {
                const dt = isoToDate(d.date);
                const wd = TH_WEEKDAYS_SHORT[dt.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6];
                const day = String(dt.getDate());

                const hasData = d.macroKcal > 0;
                const h = hasData ? Math.max(2, Math.round((d.macroKcal / maxMacroKcal) * 120)) : 0;
                const total = hasData ? d.macroKcal : 1;
                const carbsH = hasData ? Math.round((d.carbsKcal / total) * h) : 0;
                const proteinH = hasData ? Math.round((d.proteinKcal / total) * h) : 0;
                const fatH = hasData ? Math.max(0, h - carbsH - proteinH) : 0;

                return (
                  <div key={d.date} className="flex w-full min-w-[34px] flex-col items-center gap-2">
                    <div className="w-full max-w-[34px]">
                      <div className="flex h-[120px] w-full flex-col justify-end bg-white/0">
                        {hasData ? (
                          <>
                            <div className="w-full bg-yellow-400" style={{ height: fatH }} />
                            <div className="w-full bg-emerald-500" style={{ height: proteinH }} />
                            <div className="w-full bg-sky-500" style={{ height: carbsH }} />
                          </>
                        ) : (
                          <div className="h-2 w-full rounded bg-gray-200" />
                        )}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[11px] font-semibold text-gray-700">{wd}</div>
                      <div className="text-[11px] font-semibold text-gray-500">{day}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gray-50 p-3">
              <div className="text-[11px] font-medium text-gray-600">เฉลี่ย {range === 'all' ? 'ทั้งหมด' : `${range} วัน`}</div>
              <div className="mt-1 text-base font-semibold">{avgCalories.toFixed(0)} kcal</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-3">
              <div className="text-[11px] font-medium text-gray-600">เป้าหมาย/วัน</div>
              <div className="mt-1 text-base font-semibold">{target} kcal</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-gray-50 p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-gray-600">
                <span className="h-2 w-2 rounded-sm bg-emerald-500" aria-hidden="true" />
                โปรตีน
              </div>
              <div className="mt-1 text-base font-semibold">{rangeProteinG.toFixed(0)}g</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-gray-600">
                <span className="h-2 w-2 rounded-sm bg-sky-500" aria-hidden="true" />
                คาร์บ
              </div>
              <div className="mt-1 text-base font-semibold">{rangeCarbsG.toFixed(0)}g</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-gray-600">
                <span className="h-2 w-2 rounded-sm bg-yellow-400" aria-hidden="true" />
                ไขมัน
              </div>
              <div className="mt-1 text-base font-semibold">{rangeFatG.toFixed(0)}g</div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="น้ำหนัก">
        {weightValues.length < 2 ? (
          <div className="text-sm text-gray-600">ยังไม่มีข้อมูลเพียงพอสำหรับกราฟ (ลองบันทึกน้ำหนักเพิ่ม)</div>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-2xl bg-gray-50 p-3">
              <div className="pointer-events-none absolute left-3 right-3 top-3" style={{ height: 88 }} aria-hidden="true">
                {weightTicks.map((t) => (
                  <div key={t.p} className="absolute left-0 right-0" style={{ top: `${(1 - t.p) * 88}px` }}>
                    <div className="absolute -right-0 top-0 -translate-y-1/2 text-[11px] font-semibold text-gray-500">{t.v.toFixed(1)}</div>
                    {t.p === 0 || t.p === 1 ? null : <div className="h-px w-full bg-gray-200" />}
                  </div>
                ))}
              </div>
              <Sparkline values={weightValues} className="w-full" style={{ width: '100%', height: 88 }} />
            </div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600">
              <span>{weightFromDate ?? ''}</span>
              <span>{weightToDate ?? ''}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-gray-50 p-3">
                <div className="text-[11px] font-medium text-gray-600">ต่ำสุด</div>
                <div className="mt-1 text-sm font-semibold">{weightMin.toFixed(1)}</div>
              </div>
              <div className="rounded-2xl bg-gray-50 p-3">
                <div className="text-[11px] font-medium text-gray-600">ล่าสุด</div>
                <div className="mt-1 text-sm font-semibold">{latestWeight.toFixed(1)}</div>
              </div>
              <div className="rounded-2xl bg-gray-50 p-3">
                <div className="text-[11px] font-medium text-gray-600">สูงสุด</div>
                <div className="mt-1 text-sm font-semibold">{weightMax.toFixed(1)}</div>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card title="BMI">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-sm font-semibold text-gray-900">{Number.isFinite(bmi) ? bmi.toFixed(1) : '-'}</div>
            <div className="text-xs font-semibold text-gray-700">{bmiLabel}</div>
          </div>
          <div className="relative h-4 w-full overflow-hidden rounded-full">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500" />
            <div
              className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-white bg-gray-900 shadow"
              style={{ left: `calc(${(bmiPos * 100).toFixed(2)}% - 12px)` }}
              aria-label="ตำแหน่ง BMI"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600">
            <span>{bmiMin}</span>
            <span>{bmiMax}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
