import { NextResponse } from 'next/server';

import { updateFoodLog } from '@/lib/services/foodService';
import { DEFAULT_USER_ID } from '@/lib/constants/defaults';
import type { IsoDateString } from '@/types/domain';

const isIsoDate = (v: string): v is IsoDateString => /^\d{4}-\d{2}-\d{2}$/.test(v);

const getRequestOrigin = (request: Request) => {
  const h = request.headers;
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
};

export async function POST(request: Request) {
  const formData = await request.formData();

  const id = formData.get('id');
  const date = formData.get('date');
  const foodName = formData.get('foodName') ?? formData.get('name');
  const calories = formData.get('calories');
  const protein = formData.get('protein');
  const fat = formData.get('fat');
  const carbs = formData.get('carbs');

  if (
    typeof id !== 'string' ||
    typeof date !== 'string' ||
    !isIsoDate(date) ||
    typeof foodName !== 'string' ||
    typeof calories !== 'string' ||
    typeof protein !== 'string' ||
    typeof fat !== 'string' ||
    typeof carbs !== 'string'
  ) {
    return NextResponse.redirect(
      new URL(`/diary?date=${encodeURIComponent(String(date ?? ''))}&err=${encodeURIComponent('ข้อมูลไม่ถูกต้อง')}`, getRequestOrigin(request))
    );
  }

  try {
    await updateFoodLog({
      userId: DEFAULT_USER_ID,
      id,
      foodName,
      calories: Number(calories),
      protein: Number(protein),
      fat: Number(fat),
      carbs: Number(carbs),
    });

    return NextResponse.redirect(new URL(`/diary?date=${date}`, getRequestOrigin(request)));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e ?? 'ไม่สามารถแก้ไขรายการได้');
    return NextResponse.redirect(new URL(`/diary?date=${date}&err=${encodeURIComponent(msg)}`, getRequestOrigin(request)));
  }
}
