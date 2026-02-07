import { redirect } from 'next/navigation';

import { Card, Field, Input, DangerButton } from '@/components/ui';
import SubmitButton from '@/components/SubmitButton';
import { addFoodLog, deleteFoodLog, listFoodLogsByDate } from '@/lib/services/foodService';
import { getUserProfile } from '@/lib/services/userService';
import { getUserIdOrRedirect } from '@/lib/supabase/auth';
import { todayIsoDate } from '@/db/local/store';

export const dynamic = 'force-dynamic';

export default async function FoodPage() {
  const userId = await getUserIdOrRedirect();
  const profile = await getUserProfile(userId);
  if (!profile) redirect('/profile');

  const date = todayIsoDate();
  const logs = await listFoodLogsByDate({ userId: profile.id, date });

  const createLog = async (formData: FormData) => {
    'use server';

    const foodName = formData.get('foodName');
    const calories = formData.get('calories');
    const protein = formData.get('protein');
    const fat = formData.get('fat');
    const carbs = formData.get('carbs');

    if (
      typeof foodName !== 'string' ||
      typeof calories !== 'string' ||
      typeof protein !== 'string' ||
      typeof fat !== 'string' ||
      typeof carbs !== 'string'
    ) {
      throw new Error('Invalid form data');
    }

    await addFoodLog({
      userId: profile.id,
      date,
      foodName,
      calories: Number(calories),
      protein: Number(protein),
      fat: Number(fat),
      carbs: Number(carbs),
    });

    redirect('/food');
  };

  const removeLog = async (formData: FormData) => {
    'use server';

    const id = formData.get('id');
    if (typeof id !== 'string') throw new Error('Invalid id');

    await deleteFoodLog({ userId: profile.id, id });
    redirect('/food');
  };

  const total = logs.reduce((sum, l) => sum + l.calories, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">อาหาร</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={`เพิ่มอาหาร (${date})`}>
          <form action={createLog} className="space-y-3">
            <Field label="ชื่ออาหาร">
              <Input name="foodName" placeholder="เช่น ข้าวมันไก่" required />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="แคลอรี่">
                <Input name="calories" type="number" min={0} step="1" required />
              </Field>
              <Field label="โปรตีน (กรัม)">
                <Input name="protein" type="number" min={0} step="0.1" required />
              </Field>
              <Field label="ไขมัน (กรัม)">
                <Input name="fat" type="number" min={0} step="0.1" required />
              </Field>
              <Field label="คาร์บ (กรัม)">
                <Input name="carbs" type="number" min={0} step="0.1" required />
              </Field>
            </div>
            <SubmitButton loadingText="กำลังเพิ่ม…">เพิ่ม</SubmitButton>
          </form>
        </Card>

        <Card title={`สรุปวันนี้ (${date})`}>
          <div className="space-y-2">
            <div className="text-sm text-gray-600">แคลอรี่รวม</div>
            <div className="text-2xl font-semibold">{total}</div>
            <div className="mt-3 space-y-2">
              {logs.length === 0 ? (
                <div className="text-sm text-gray-600">ยังไม่มีรายการอาหาร</div>
              ) : (
                <ul className="space-y-2">
                  {logs.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{l.foodName}</div>
                        <div className="text-xs text-gray-600">
                          P {l.protein}g / F {l.fat}g / C {l.carbs}g
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold">{l.calories}</div>
                        <form action={removeLog}>
                          <input type="hidden" name="id" value={l.id} />
                          <DangerButton type="submit">ลบ</DangerButton>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
