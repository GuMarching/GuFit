import { NextResponse } from 'next/server';

import { estimateFoodFromTextWithGemini } from '@/lib/services/geminiService';
import { addFoodLog } from '@/lib/services/foodService';
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

  const date = formData.get('date');
  const text = formData.get('text');
  const preview = formData.get('preview');

  if (typeof date !== 'string' || !isIsoDate(date) || typeof text !== 'string') {
    return NextResponse.redirect(
      new URL(`/diary?date=${encodeURIComponent(String(date ?? ''))}&err=${encodeURIComponent('ข้อมูลไม่ถูกต้อง')}`, getRequestOrigin(request))
    );
  }

  try {
    const estimated = await estimateFoodFromTextWithGemini({ text });

    const calories = Number(estimated?.calories ?? 0);
    const protein = Number(estimated?.protein ?? 0);
    const fat = Number(estimated?.fat ?? 0);
    const carbs = Number(estimated?.carbs ?? 0);
    const allZero = calories <= 0 && protein <= 0 && fat <= 0 && carbs <= 0;
    const badNumber =
      !Number.isFinite(calories) || !Number.isFinite(protein) || !Number.isFinite(fat) || !Number.isFinite(carbs);
    if (allZero || badNumber) {
      throw new Error('AI ประเมินไม่ได้ (ผลลัพธ์เป็น 0) กรุณาลองพิมพ์ละเอียดขึ้น หรือกดประเมินใหม่');
    }

    if (preview === '1' || preview === 'true') {
      return NextResponse.json({ date, estimated });
    }

    await addFoodLog({
      userId: DEFAULT_USER_ID,
      date,
      foodName: estimated.foodName,
      calories: estimated.calories,
      protein: estimated.protein,
      fat: estimated.fat,
      carbs: estimated.carbs,
    });

    return NextResponse.redirect(new URL(`/diary?date=${date}`, getRequestOrigin(request)));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e ?? 'ไม่สามารถเรียก AI ได้');

    if (preview === '1' || preview === 'true') {
      return NextResponse.json({ error: msg }, { status: 200 });
    }

    return NextResponse.redirect(new URL(`/diary?date=${date}&err=${encodeURIComponent(msg)}`, getRequestOrigin(request)));
  }
}
