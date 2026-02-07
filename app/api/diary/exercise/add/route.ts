import { NextResponse } from 'next/server';

import { addExerciseLog } from '@/lib/services/exerciseService';
import { DEFAULT_USER_ID } from '@/lib/constants/defaults';
import type { IsoDateString } from '@/types/domain';
import { isSupabaseEnabled } from '@/lib/supabase/client';
import { getUserIdOrRedirect } from '@/lib/supabase/auth';

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
  const caloriesBurned = formData.get('caloriesBurned');

  if (
    typeof date !== 'string' ||
    !isIsoDate(date) ||
    typeof name !== 'string' ||
    typeof caloriesBurned !== 'string'
  ) {
    return NextResponse.redirect(
      new URL(`/diary?date=${encodeURIComponent(String(date ?? ''))}&err=${encodeURIComponent('ข้อมูลไม่ถูกต้อง')}`, getRequestOrigin(request))
    );
  }

  try {
    const userId = isSupabaseEnabled() ? await getUserIdOrRedirect() : DEFAULT_USER_ID;

    await addExerciseLog({
      userId,
      date,
      name,
      caloriesBurned: Number(caloriesBurned),
    });

    return NextResponse.redirect(new URL(`/diary?date=${date}`, getRequestOrigin(request)));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e ?? 'บันทึกไม่สำเร็จ');
    return NextResponse.redirect(new URL(`/diary?date=${date}&err=${encodeURIComponent(msg)}`, getRequestOrigin(request)));
  }
}
