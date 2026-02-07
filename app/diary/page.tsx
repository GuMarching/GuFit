import { redirect } from 'next/navigation';

import { Card, Field, Input, Progress, StatRow } from '@/components/ui';
import SubmitSecondaryButton from '@/components/SubmitSecondaryButton';
import ConfirmSubmitDanger from '@/components/ConfirmSubmitDanger';
import { getUserProfile } from '@/lib/services/userService';
import { listFoodLogsByDate } from '@/lib/services/foodService';
import { listExerciseLogsByDate } from '@/lib/services/exerciseService';
import { deleteFoodLog, updateFoodLog } from '@/lib/services/foodService';
import { deleteExerciseLog, updateExerciseLog } from '@/lib/services/exerciseService';
import { todayIsoDate } from '@/db/local/store';
import { calculateBmr, calculateDailyCalorieTarget, calculateTdee } from '@/lib/calculations/metabolism';
import { DiaryDateNav } from '@/components/diary/DiaryDateNav';
import { DiaryQuickAdd } from '@/components/diary/DiaryQuickAdd';
import { isGeminiEnabled } from '@/lib/services/geminiService';
import { fmt1 } from '@/lib/format';
import type { IsoDateString } from '@/types/domain';
import { getUserIdOrRedirect } from '@/lib/supabase/auth';

const isIsoDate = (v: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function DiaryPage(props: { searchParams?: { date?: string; err?: string } }) {
  const userId = await getUserIdOrRedirect();
  const profile = await getUserProfile(userId);
  if (!profile) redirect('/profile');

  const dateParam = props.searchParams?.date;
  const date = (typeof dateParam === 'string' && isIsoDate(dateParam) ? dateParam : todayIsoDate()) as IsoDateString;
  const errParam = props.searchParams?.err;
  const errText = typeof errParam === 'string' && errParam.length > 0 ? decodeURIComponent(errParam) : null;

  const addParam = (props.searchParams as { add?: string } | undefined)?.add;
  const openAdd = addParam === '1' || addParam === 'true';

  const foodLogs = await listFoodLogsByDate({ userId: profile.id, date });
  const exerciseLogs = await listExerciseLogsByDate({ userId: profile.id, date });

  const bmr = calculateBmr({
    gender: profile.gender,
    age: profile.age,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
  });
  const tdee = calculateTdee({ bmr, activityLevel: profile.activityLevel });
  const target = calculateDailyCalorieTarget({ tdee, goalType: profile.goalType });

  const eaten = foodLogs.reduce((sum, l) => sum + l.calories, 0);
  const burned = exerciseLogs.reduce((sum, l) => sum + l.caloriesBurned, 0);
  const net = eaten - burned;
  const left = target - net;

  const protein = foodLogs.reduce((sum, l) => sum + l.protein, 0);
  const fat = foodLogs.reduce((sum, l) => sum + l.fat, 0);
  const carbs = foodLogs.reduce((sum, l) => sum + l.carbs, 0);

  const proteinTarget = Math.round((target * 0.3) / 4);
  const carbsTarget = Math.round((target * 0.45) / 4);
  const fatTarget = Math.round((target * 0.25) / 9);
  const proteinLeft = proteinTarget - protein;
  const carbsLeft = carbsTarget - carbs;
  const fatLeft = fatTarget - fat;

  const updateFood = async (formData: FormData) => {
    'use server';
    const id = formData.get('id');
    const foodName = formData.get('foodName');
    const calories = formData.get('calories');
    const proteinV = formData.get('protein');
    const fatV = formData.get('fat');
    const carbsV = formData.get('carbs');
    if (
      typeof id !== 'string' ||
      typeof foodName !== 'string' ||
      typeof calories !== 'string' ||
      typeof proteinV !== 'string' ||
      typeof fatV !== 'string' ||
      typeof carbsV !== 'string'
    ) {
      redirect(`/diary?date=${date}&err=${encodeURIComponent('ข้อมูลไม่ถูกต้อง')}`);
    }
    try {
      await updateFoodLog({
        userId: profile.id,
        id,
        foodName,
        calories: Number(calories),
        protein: Number(proteinV),
        fat: Number(fatV),
        carbs: Number(carbsV),
      });
      redirect(`/diary?date=${date}&ok=${encodeURIComponent('บันทึกเรียบร้อยแล้ว')}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ';
      redirect(`/diary?date=${date}&err=${encodeURIComponent(msg)}`);
    }
  };

  const removeFood = async (formData: FormData) => {
    'use server';
    const id = formData.get('id');
    if (typeof id !== 'string') redirect(`/diary?date=${date}&err=${encodeURIComponent('ข้อมูลไม่ถูกต้อง')}`);
    try {
      await deleteFoodLog({ userId: profile.id, id });
      redirect(`/diary?date=${date}&ok=${encodeURIComponent('ลบรายการเรียบร้อยแล้ว')}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'ลบไม่สำเร็จ';
      redirect(`/diary?date=${date}&err=${encodeURIComponent(msg)}`);
    }
  };

  const updateExercise = async (formData: FormData) => {
    'use server';
    const id = formData.get('id');
    const name = formData.get('name');
    const caloriesBurned = formData.get('caloriesBurned');
    if (typeof id !== 'string' || typeof name !== 'string' || typeof caloriesBurned !== 'string') {
      redirect(`/diary?date=${date}&err=${encodeURIComponent('ข้อมูลไม่ถูกต้อง')}`);
    }
    try {
      await updateExerciseLog({
        userId: profile.id,
        id,
        name,
        caloriesBurned: Number(caloriesBurned),
      });
      redirect(`/diary?date=${date}&ok=${encodeURIComponent('บันทึกเรียบร้อยแล้ว')}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ';
      redirect(`/diary?date=${date}&err=${encodeURIComponent(msg)}`);
    }
  };

  const removeExercise = async (formData: FormData) => {
    'use server';
    const id = formData.get('id');
    if (typeof id !== 'string') redirect(`/diary?date=${date}&err=${encodeURIComponent('ข้อมูลไม่ถูกต้อง')}`);
    try {
      await deleteExerciseLog({ userId: profile.id, id });
      redirect(`/diary?date=${date}&ok=${encodeURIComponent('ลบรายการเรียบร้อยแล้ว')}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'ลบไม่สำเร็จ';
      redirect(`/diary?date=${date}&err=${encodeURIComponent(msg)}`);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">ไดอารี่</h1>
        <div className="mt-2">
          <DiaryDateNav date={date} />
        </div>
      </div>

      {errText ? (
        <Card title="เกิดข้อผิดพลาด">
          <div className="text-sm text-gray-700">{errText}</div>
          <div className="mt-2 text-xs text-gray-500">
            ถ้ายังไม่ตั้งค่า API key ให้ตรวจสอบไฟล์ .env.local และรีสตาร์ทเซิร์ฟเวอร์
          </div>
        </Card>
      ) : null}

      <Card title="สรุปวันนี้">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-3xl border border-gray-100 bg-gray-50/80 p-3 shadow-sm">
              <div className="text-[11px] font-semibold text-gray-600">เป้าหมาย</div>
              <div className="mt-1 text-xl font-extrabold text-gray-900">{target}</div>
            </div>
            <div className="rounded-3xl border border-gray-100 bg-gray-50/80 p-3 shadow-sm">
              <div className="text-[11px] font-semibold text-gray-600">สุทธิ</div>
              <div className="mt-1 text-xl font-extrabold text-gray-900">{net}</div>
            </div>
            <div className="rounded-3xl border border-gray-100 bg-gray-50/80 p-3 shadow-sm">
              <div className="text-[11px] font-semibold text-gray-600">คงเหลือ</div>
              <div className={left >= 0 ? 'mt-1 text-xl font-extrabold text-teal-800' : 'mt-1 text-xl font-extrabold text-rose-700'}>
                {left}
              </div>
            </div>
          </div>

          <Progress value={net} max={target} />

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-3xl border border-gray-100 bg-gray-50/80 p-3 shadow-sm">
              <div className="text-[11px] font-semibold text-gray-600">โปรตีนคงเหลือ</div>
              <div className={proteinLeft >= 0 ? 'mt-1 text-base font-extrabold text-teal-800' : 'mt-1 text-base font-extrabold text-rose-700'}>
                {fmt1(proteinLeft)}g
              </div>
              <div className="mt-1 text-[11px] font-semibold text-gray-600">กิน {fmt1(protein)} / {proteinTarget}g</div>
            </div>
            <div className="rounded-3xl border border-gray-100 bg-gray-50/80 p-3 shadow-sm">
              <div className="text-[11px] font-semibold text-gray-600">ไขมันคงเหลือ</div>
              <div className={fatLeft >= 0 ? 'mt-1 text-base font-extrabold text-teal-800' : 'mt-1 text-base font-extrabold text-rose-700'}>
                {fmt1(fatLeft)}g
              </div>
              <div className="mt-1 text-[11px] font-semibold text-gray-600">กิน {fmt1(fat)} / {fatTarget}g</div>
            </div>
            <div className="rounded-3xl border border-gray-100 bg-gray-50/80 p-3 shadow-sm">
              <div className="text-[11px] font-semibold text-gray-600">คาร์บคงเหลือ</div>
              <div className={carbsLeft >= 0 ? 'mt-1 text-base font-extrabold text-teal-800' : 'mt-1 text-base font-extrabold text-rose-700'}>
                {fmt1(carbsLeft)}g
              </div>
              <div className="mt-1 text-[11px] font-semibold text-gray-600">กิน {fmt1(carbs)} / {carbsTarget}g</div>
            </div>
          </div>

          <div className="space-y-2">
            <StatRow label="กินไป" value={eaten} />
            <StatRow label="เผาผลาญ" value={burned} />
            <StatRow label="TDEE" value={tdee} sub="ค่าประเมิน" />
          </div>
        </div>
      </Card>

      <Card title="รายการอาหาร">
        {foodLogs.length === 0 ? (
          <div className="text-sm text-gray-600">ยังไม่มีรายการอาหารวันนี้</div>
        ) : (
          <ul className="space-y-2">
            {foodLogs.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{l.foodName}</div>
                  <div className="text-xs text-gray-600">
                    {l.calories} แคล · โปรตีน {fmt1(l.protein)}g · ไขมัน {fmt1(l.fat)}g · คาร์บ {fmt1(l.carbs)}g
                  </div>

                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-gray-700">แก้ไข</summary>
                    <form action={updateFood} className="mt-2 space-y-2">
                      <input type="hidden" name="id" value={l.id} />
                      <Field label="ชื่ออาหาร">
                        <Input name="foodName" defaultValue={l.foodName} required />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="แคลอรี่">
                          <Input name="calories" type="number" min={0} step="any" defaultValue={String(l.calories)} required />
                        </Field>
                        <Field label="โปรตีน">
                          <Input name="protein" type="number" min={0} step="any" defaultValue={String(l.protein)} required />
                        </Field>
                        <Field label="ไขมัน">
                          <Input name="fat" type="number" min={0} step="any" defaultValue={String(l.fat)} required />
                        </Field>
                        <Field label="คาร์บ">
                          <Input name="carbs" type="number" min={0} step="any" defaultValue={String(l.carbs)} required />
                        </Field>
                      </div>
                      <SubmitSecondaryButton loadingText="กำลังบันทึก…">บันทึกการแก้ไข</SubmitSecondaryButton>
                    </form>
                  </details>
                </div>

                <div className="flex flex-col gap-2">
                  <form action={removeFood}>
                    <input type="hidden" name="id" value={l.id} />
                    <ConfirmSubmitDanger label="ลบ" confirmTitle="ยืนยันการลบ" confirmText="ต้องการลบรายการอาหารนี้จริงหรือไม่?" />
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="รายการกิจกรรม">
        {exerciseLogs.length === 0 ? (
          <div className="text-sm text-gray-600">ยังไม่มีกิจกรรมวันนี้</div>
        ) : (
          <ul className="space-y-2">
            {exerciseLogs.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{l.name}</div>
                  <div className="text-xs text-gray-600">{l.caloriesBurned} kcal</div>

                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-gray-700">แก้ไข</summary>
                    <form action={updateExercise} className="mt-2 space-y-2">
                      <input type="hidden" name="id" value={l.id} />
                      <Field label="กิจกรรม">
                        <Input name="name" defaultValue={l.name} required />
                      </Field>
                      <Field label="แคลอรี่ที่เผาผลาญ (kcal)">
                        <Input name="caloriesBurned" type="number" min={0} step="any" defaultValue={String(l.caloriesBurned)} required />
                      </Field>
                      <SubmitSecondaryButton loadingText="กำลังบันทึก…">บันทึกการแก้ไข</SubmitSecondaryButton>
                    </form>
                  </details>
                </div>

                <div className="flex flex-col gap-2">
                  <form action={removeExercise}>
                    <input type="hidden" name="id" value={l.id} />
                    <ConfirmSubmitDanger label="ลบ" confirmTitle="ยืนยันการลบ" confirmText="ต้องการลบรายการกิจกรรมนี้จริงหรือไม่?" />
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <DiaryQuickAdd
        geminiEnabled={isGeminiEnabled()}
        date={date}
        initialOpen={openAdd}
      />
    </div>
  );
}
