import { NextResponse } from 'next/server';

import { estimateFoodFromTextWithGemini } from '@/lib/services/geminiService';
import { addExerciseLog } from '@/lib/services/exerciseService';
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
  const name = formData.get('name');
  const minutes = formData.get('minutes');

  if (typeof date !== 'string' || !isIsoDate(date) || typeof name !== 'string' || typeof minutes !== 'string') {
    return NextResponse.redirect(
      new URL(`/diary?date=${encodeURIComponent(String(date ?? ''))}&err=${encodeURIComponent('ข้อมูลไม่ถูกต้อง')}`, getRequestOrigin(request))
    );
  }

  try {
    // MVP heuristic: ask Gemini to estimate calories burned.
    // We reuse the food estimator (same JSON schema) and interpret calories as kcal burned.
    const text = `ประเมินแคลอรี่ที่เผาผลาญจากกิจกรรมออกกำลังกายนี้: ${name} เป็นเวลา ${minutes} นาที. ตอบเป็น JSON เท่านั้น โดย calories คือ kcal ที่เผาผลาญ. โปรตีน/ไขมัน/คาร์บ ให้ใส่ 0.`;
    const estimated = await estimateFoodFromTextWithGemini({ text });

    const kcal = Math.max(0, Number(estimated.calories ?? 0));
    const label = `${name} ${minutes} นาที`;

    await addExerciseLog({
      userId: DEFAULT_USER_ID,
      date,
      name: label,
      caloriesBurned: kcal,
    });

    return NextResponse.redirect(new URL(`/diary?date=${date}`, getRequestOrigin(request)));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e ?? 'ไม่สามารถเรียก AI ได้');
    return NextResponse.redirect(new URL(`/diary?date=${date}&err=${encodeURIComponent(msg)}`, getRequestOrigin(request)));
  }
}
