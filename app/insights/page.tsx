import { redirect } from 'next/navigation';

import { Card, StatRow } from '@/components/ui';
import { getUserProfile } from '@/lib/services/userService';
import { listFoodLogsByRange } from '@/lib/services/foodService';
import { listWeightLogs } from '@/lib/services/weightService';
import { todayIsoDate } from '@/db/local/store';
import { Sparkline } from '@/components/sparkline';
import { getUserIdOrRedirect } from '@/lib/supabase/auth';
import { fmt0, fmt1 } from '@/lib/format';
import type { IsoDateString } from '@/types/domain';

export const dynamic = 'force-dynamic';

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

export default async function InsightsPage() {
  const userId = await getUserIdOrRedirect();
  const profile = await getUserProfile(userId);
  if (!profile) redirect('/profile');

  const today = todayIsoDate();
  const last7 = Array.from({ length: 7 }).map((_, i) => addDays(today, i - 6));

  const from = last7[0] as IsoDateString;
  const to = last7[last7.length - 1] as IsoDateString;
  const logs = await listFoodLogsByRange({ userId: profile.id, from, to });
  const totalsByDate = new Map<
    string,
    {
      date: string;
      calories: number;
      proteinKcal: number;
      fatKcal: number;
      carbsKcal: number;
      macroKcal: number;
    }
  >();

  for (const l of logs) {
    const prev = totalsByDate.get(l.date) ?? {
      date: l.date,
      calories: 0,
      proteinKcal: 0,
      fatKcal: 0,
      carbsKcal: 0,
      macroKcal: 0,
    };

    const proteinKcal = l.protein * 4;
    const carbsKcal = l.carbs * 4;
    const fatKcal = l.fat * 9;
    totalsByDate.set(l.date, {
      date: l.date,
      calories: prev.calories + l.calories,
      proteinKcal: prev.proteinKcal + proteinKcal,
      fatKcal: prev.fatKcal + fatKcal,
      carbsKcal: prev.carbsKcal + carbsKcal,
      macroKcal: prev.macroKcal + (proteinKcal + carbsKcal + fatKcal),
    });
  }

  const foodByDay = last7.map((d) =>
    totalsByDate.get(d) ?? {
      date: d,
      calories: 0,
      proteinKcal: 0,
      fatKcal: 0,
      carbsKcal: 0,
      macroKcal: 0,
    },
  );

  const avgCalories =
    foodByDay.length > 0 ? foodByDay.reduce((s, x) => s + x.calories, 0) / foodByDay.length : 0;

  const maxMacroKcal = Math.max(1, ...foodByDay.map((d) => d.macroKcal));

  const weightLogs = await listWeightLogs({ userId: profile.id });
  const weightAscending = [...weightLogs].sort((a, b) => (a.date > b.date ? 1 : -1));
  const weightLast30 = weightAscending.slice(Math.max(0, weightAscending.length - 30));
  const weightValues = weightLast30.map((l) => l.weightKg);
  const latestWeight = weightAscending.length > 0 ? weightAscending[weightAscending.length - 1]!.weightKg : profile.weightKg;

  const heightM = profile.heightCm / 100;
  const bmi = heightM > 0 ? latestWeight / (heightM * heightM) : 0;

  const bmiMin = 15;
  const bmiMax = 40;
  const bmiPos = clamp((bmi - bmiMin) / (bmiMax - bmiMin), 0, 1);

  const bmiLabel =
    bmi < 18.5
      ? 'น้ำหนักน้อย'
      : bmi < 25
        ? 'ปกติ'
        : bmi < 30
          ? 'เกิน'
          : 'อ้วน';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">ข้อมูลเชิงลึก</h1>
        <div className="mt-1 text-sm text-gray-600">ภาพรวม 7 วันล่าสุด</div>
      </div>

      <Card title="แคลอรี่เฉลี่ย (กราฟมาโคร)">
        <div className="space-y-3">
          <div className="rounded-2xl border bg-white p-3">
            <div className="flex items-end justify-between gap-2">
              {foodByDay.map((d) => {
                const dt = isoToDate(d.date);
                const wd = TH_WEEKDAYS_SHORT[dt.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6];
                const day = String(dt.getDate());

                const h = Math.max(6, Math.round((d.macroKcal / maxMacroKcal) * 120));
                const total = Math.max(1, d.macroKcal);

                const carbsH = Math.round((d.carbsKcal / total) * h);
                const proteinH = Math.round((d.proteinKcal / total) * h);
                const fatH = Math.max(0, h - carbsH - proteinH);

                return (
                  <div key={d.date} className="flex w-full flex-col items-center gap-2">
                    <div className="w-full max-w-[32px]">
                      <div className="flex h-[120px] w-full flex-col justify-end rounded-2xl bg-gray-50 p-1">
                        <div className="w-full rounded-xl bg-amber-300/85 ring-1 ring-inset ring-black/5" style={{ height: fatH }} />
                        <div className="mt-1 w-full rounded-xl bg-teal-600/85 ring-1 ring-inset ring-black/5" style={{ height: proteinH }} />
                        <div className="mt-1 w-full rounded-xl bg-indigo-500/85 ring-1 ring-inset ring-black/5" style={{ height: carbsH }} />
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

            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-xl border bg-gray-50 px-2 py-2">
                <div className="font-semibold text-gray-900">เฉลี่ย</div>
                <div className="mt-1 text-gray-700">{fmt0(avgCalories)} kcal/วัน</div>
              </div>
              <div className="rounded-xl border bg-gray-50 px-2 py-2">
                <div className="font-semibold text-gray-900">สี</div>
                <div className="mt-1 space-y-1 text-gray-700">
                  <div>โปรตีน: เขียว</div>
                  <div>ไขมัน: เหลือง</div>
                  <div>คาร์บ: ฟ้า</div>
                </div>
              </div>
              <div className="rounded-xl border bg-gray-50 px-2 py-2">
                <div className="font-semibold text-gray-900">หมายเหตุ</div>
                <div className="mt-1 text-gray-700">ความสูงกราฟอิงจากแคลอรี่จากมาโคร</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <StatRow label="เฉลี่ย 7 วัน" value={Number(fmt0(avgCalories))} sub="kcal/วัน" />
          </div>
        </div>
      </Card>

      <Card title="แนวโน้มน้ำหนัก">
        {weightValues.length < 2 ? (
          <div className="text-sm text-gray-600">ยังไม่มีข้อมูลเพียงพอสำหรับกราฟ (ลองบันทึกน้ำหนักเพิ่ม)</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl bg-gray-50 p-3">
              <Sparkline values={weightValues} className="w-full" style={{ width: '100%', height: 88 }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border bg-white p-3">
                <div className="text-[11px] font-medium text-gray-600">ล่าสุด</div>
                <div className="mt-1 text-lg font-semibold">{fmt1(latestWeight)} กก.</div>
              </div>
              <div className="rounded-2xl border bg-white p-3">
                <div className="text-[11px] font-medium text-gray-600">ช่วงข้อมูล</div>
                <div className="mt-1 text-sm font-semibold">{weightLast30.length} วันล่าสุด</div>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card title="BMI">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border bg-white p-3">
              <div className="text-[11px] font-medium text-gray-600">BMI ปัจจุบัน</div>
              <div className="mt-1 text-lg font-semibold">{fmt1(bmi)}</div>
              <div className="mt-1 text-xs font-semibold text-gray-700">{bmiLabel}</div>
            </div>
            <div className="rounded-2xl border bg-white p-3">
              <div className="text-[11px] font-medium text-gray-600">น้ำหนักล่าสุด</div>
              <div className="mt-1 text-lg font-semibold">{fmt1(latestWeight)} กก.</div>
              <div className="mt-1 text-xs text-gray-600">สูง {profile.heightCm} ซม.</div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="relative h-4 w-full overflow-hidden rounded-full">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-400 via-amber-300 to-teal-400" />
              <div
                className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-white bg-gray-900 shadow ring-2 ring-white/70"
                style={{ left: `calc(${(bmiPos * 100).toFixed(2)}% - 12px)` }}
                aria-label="ตำแหน่ง BMI"
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-gray-600">
              <span>{bmiMin}</span>
              <span>{bmiMax}</span>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              โซนสีเขียวใกล้ช่วง BMI ปกติ (18.5–24.9)
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
