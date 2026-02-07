import { redirect } from 'next/navigation';

import { Card, Field, Input } from '@/components/ui';
import SubmitButton from '@/components/SubmitButton';
import { getUserProfile } from '@/lib/services/userService';
import { listWeightLogs, upsertWeightForDate } from '@/lib/services/weightService';
import { todayIsoDate } from '@/db/local/store';
import WeightLineChart from '@/components/weight/WeightLineChart';
import { getUserIdOrRedirect } from '@/lib/supabase/auth';
import { DiaryDateNav } from '@/components/diary/DiaryDateNav';
import { fmt1 } from '@/lib/format';
import type { IsoDateString } from '@/types/domain';

const isIsoDate = (v: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(v);

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

export default async function WeightPage(props: { searchParams?: { date?: string; range?: string } }) {
  const userId = await getUserIdOrRedirect();
  const profile = await getUserProfile(userId);
  if (!profile) redirect('/profile');

  const dateParam = props.searchParams?.date;
  const date = (typeof dateParam === 'string' && isIsoDate(dateParam) ? dateParam : todayIsoDate()) as IsoDateString;

  const rangeParam = props.searchParams?.range;
  const range: '7' | '30' | 'all' = rangeParam === '30' ? '30' : rangeParam === 'all' ? 'all' : '7';

  const logs = await listWeightLogs({ userId });
  const ascending = [...logs].sort((a, b) => (a.date > b.date ? 1 : -1));

  const from = (range === '7' ? addDays(date, -6) : range === '30' ? addDays(date, -29) : '2000-01-01') as IsoDateString;
  const to = date;
  const rangeAscending = range === 'all' ? ascending : ascending.filter((l) => l.date >= from && l.date <= to);

  const values = rangeAscending.map((l) => l.weightKg);
  const latest = ascending.length > 0 ? ascending[ascending.length - 1]!.weightKg : null;
  const firstInRange = rangeAscending.length > 0 ? rangeAscending[0]!.weightKg : null;
  const delta = firstInRange != null && latest != null ? latest - firstInRange : null;
  const selectedExisting = ascending.find((l) => l.date === date)?.weightKg ?? null;
  const min = values.length > 0 ? Math.min(...values) : null;
  const max = values.length > 0 ? Math.max(...values) : null;

  const upsert = async (formData: FormData) => {
    'use server';

    const weightKg = formData.get('weightKg');
    if (typeof weightKg !== 'string') throw new Error('Invalid form data');

    try {
      await upsertWeightForDate({
        userId: profile.id,
        date,
        weightKg: Number(weightKg),
      });
      redirect(`/weight?date=${date}&ok=${encodeURIComponent('บันทึกน้ำหนักเรียบร้อยแล้ว')}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ';
      redirect(`/weight?date=${date}&err=${encodeURIComponent(msg)}`);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">น้ำหนัก</h1>
        <div className="mt-2">
          <DiaryDateNav date={date} basePath="/weight" />
        </div>
      </div>

      <Card title={`บันทึกน้ำหนัก (${date})`}>
        <form action={upsert} className="space-y-3">
          <Field label="น้ำหนัก (กก.)">
            <Input
              name="weightKg"
              type="number"
              min={30}
              max={300}
              step="0.1"
              defaultValue={selectedExisting != null ? String(selectedExisting) : ''}
              required
            />
          </Field>
          <SubmitButton loadingText="กำลังบันทึก…">บันทึก</SubmitButton>
        </form>
      </Card>

      <Card title={`แนวโน้ม (${range === 'all' ? 'ทั้งหมด' : `${range} วัน`})`}>
        {values.length < 2 ? (
          <div className="text-sm text-gray-600">ยังไม่มีข้อมูลเพียงพอสำหรับกราฟ</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-end gap-2">
              <a
                href={`/weight?date=${date}&range=7`}
                className={
                  range === '7'
                    ? 'rounded-full bg-teal-700 px-3 py-2 text-xs font-extrabold text-white shadow-sm'
                    : 'rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-extrabold text-gray-900 shadow-sm'
                }
              >
                7 วัน
              </a>
              <a
                href={`/weight?date=${date}&range=30`}
                className={
                  range === '30'
                    ? 'rounded-full bg-teal-700 px-3 py-2 text-xs font-extrabold text-white shadow-sm'
                    : 'rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-extrabold text-gray-900 shadow-sm'
                }
              >
                30 วัน
              </a>
              <a
                href={`/weight?date=${date}&range=all`}
                className={
                  range === 'all'
                    ? 'rounded-full bg-teal-700 px-3 py-2 text-xs font-extrabold text-white shadow-sm'
                    : 'rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-extrabold text-gray-900 shadow-sm'
                }
              >
                ทั้งหมด
              </a>
            </div>

            <WeightLineChart
              points={rangeAscending.map((l) => ({ date: l.date, weightKg: l.weightKg }))}
              heightPx={180}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl border border-gray-100 bg-gray-50/80 p-3 shadow-sm">
                <div className="text-[11px] font-semibold text-gray-600">ล่าสุด</div>
                <div className="mt-1 text-base font-extrabold text-gray-900">{latest == null ? '-' : fmt1(latest)} กก.</div>
              </div>
              <div className="rounded-3xl border border-gray-100 bg-gray-50/80 p-3 shadow-sm">
                <div className="text-[11px] font-semibold text-gray-600">เปลี่ยนแปลง</div>
                <div className={
                  delta == null
                    ? 'mt-1 text-base font-extrabold text-gray-900'
                    : delta <= 0
                      ? 'mt-1 text-base font-extrabold text-teal-800'
                      : 'mt-1 text-base font-extrabold text-rose-700'
                }>
                  {delta == null ? '-' : `${delta > 0 ? '+' : ''}${fmt1(delta)} กก.`}
                </div>
                <div className="mt-1 text-[11px] font-semibold text-gray-600">ใน 30 วัน</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl border border-gray-100 bg-gray-50/80 p-3 shadow-sm">
                <div className="text-[11px] font-semibold text-gray-600">ต่ำสุด</div>
                <div className="mt-1 text-base font-extrabold text-gray-900">{min == null ? '-' : fmt1(min)} กก.</div>
              </div>
              <div className="rounded-3xl border border-gray-100 bg-gray-50/80 p-3 shadow-sm">
                <div className="text-[11px] font-semibold text-gray-600">สูงสุด</div>
                <div className="mt-1 text-base font-extrabold text-gray-900">{max == null ? '-' : fmt1(max)} กก.</div>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card title="รายการล่าสุด">
        {logs.length === 0 ? (
          <div className="text-sm text-gray-600">ยังไม่มีการบันทึกน้ำหนัก</div>
        ) : (
          <ul className="space-y-2">
            {[...ascending]
              .sort((a, b) => (a.date > b.date ? -1 : 1))
              .slice(0, 5)
              .map((l) => (
                <li key={l.id} className="flex items-center justify-between text-sm">
                  <a className="text-gray-700 underline-offset-4 hover:underline" href={`/weight?date=${l.date}`}>
                    {l.date}
                  </a>
                  <span className="font-semibold">{fmt1(l.weightKg)} กก.</span>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
