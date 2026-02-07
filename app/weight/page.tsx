import { redirect } from 'next/navigation';

import { Card, Field, Input } from '@/components/ui';
import SubmitButton from '@/components/SubmitButton';
import { getUserProfile } from '@/lib/services/userService';
import { listWeightLogs, upsertWeightForDate } from '@/lib/services/weightService';
import { todayIsoDate } from '@/db/local/store';
import { Sparkline } from '@/components/sparkline';
import { getUserIdOrRedirect } from '@/lib/supabase/auth';
import { DiaryDateNav } from '@/components/diary/DiaryDateNav';
import type { IsoDateString } from '@/types/domain';

const isIsoDate = (v: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function WeightPage(props: { searchParams?: { date?: string } }) {
  const userId = await getUserIdOrRedirect();
  const profile = await getUserProfile(userId);
  if (!profile) redirect('/profile');

  const dateParam = props.searchParams?.date;
  const date = (typeof dateParam === 'string' && isIsoDate(dateParam) ? dateParam : todayIsoDate()) as IsoDateString;
  const logs = await listWeightLogs({ userId });
  const ascending = [...logs].sort((a, b) => (a.date > b.date ? 1 : -1));
  const last30 = ascending.slice(Math.max(0, ascending.length - 30));
  const values = last30.map((l) => l.weightKg);
  const latest = ascending.length > 0 ? ascending[ascending.length - 1]!.weightKg : null;
  const selectedExisting = ascending.find((l) => l.date === date)?.weightKg ?? null;
  const min = values.length > 0 ? Math.min(...values) : null;
  const max = values.length > 0 ? Math.max(...values) : null;

  const chartMin = min != null ? Math.floor((min - 0.1) * 2) / 2 : null;
  const chartMax = max != null ? Math.ceil((max + 0.1) * 2) / 2 : null;
  const ticks = chartMin != null && chartMax != null
    ? [1, 0.75, 0.5, 0.25, 0].map((p) => ({ p, v: chartMin + (chartMax - chartMin) * p }))
    : [];

  const upsert = async (formData: FormData) => {
    'use server';

    const weightKg = formData.get('weightKg');
    if (typeof weightKg !== 'string') throw new Error('Invalid form data');

    await upsertWeightForDate({
      userId: profile.id,
      date,
      weightKg: Number(weightKg),
    });

    redirect(`/weight?date=${date}`);
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

      <Card title="แนวโน้ม (30 วันล่าสุด)">
        {values.length < 2 ? (
          <div className="text-sm text-gray-600">ยังไม่มีข้อมูลเพียงพอสำหรับกราฟ</div>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-2xl bg-gray-50 p-3">
              <div className="pointer-events-none absolute left-3 right-3 top-3 z-0" style={{ height: 72 }} aria-hidden="true">
                {ticks.map((t) => (
                  <div key={t.p} className="absolute left-0 right-0" style={{ top: `${(1 - t.p) * 72}px` }}>
                    <div className="absolute -right-0 top-0 -translate-y-1/2 text-[11px] font-semibold text-gray-500">{t.v.toFixed(1)}</div>
                    {t.p === 0 || t.p === 1 ? null : <div className="h-px w-full bg-gray-200" />}
                  </div>
                ))}
              </div>
              <Sparkline values={values} className="relative z-10 w-full" style={{ width: '100%', height: 72 }} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-3xl border border-gray-100 bg-gray-50/80 p-3 shadow-sm">
                <div className="text-[11px] font-semibold text-gray-600">ล่าสุด</div>
                <div className="mt-1 text-base font-extrabold text-gray-900">{latest ?? '-'} กก.</div>
              </div>
              <div className="rounded-3xl border border-gray-100 bg-gray-50/80 p-3 shadow-sm">
                <div className="text-[11px] font-semibold text-gray-600">ต่ำสุด</div>
                <div className="mt-1 text-base font-extrabold text-gray-900">{min ?? '-'} กก.</div>
              </div>
              <div className="rounded-3xl border border-gray-100 bg-gray-50/80 p-3 shadow-sm">
                <div className="text-[11px] font-semibold text-gray-600">สูงสุด</div>
                <div className="mt-1 text-base font-extrabold text-gray-900">{max ?? '-'} กก.</div>
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
            {logs.slice(0, 14).map((l) => (
              <li key={l.id} className="flex items-center justify-between text-sm">
                <a className="text-gray-700 underline-offset-4 hover:underline" href={`/weight?date=${l.date}`}>
                  {l.date}
                </a>
                <span className="font-semibold">{l.weightKg} กก.</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
