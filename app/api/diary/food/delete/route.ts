import { NextResponse } from 'next/server';

import { deleteFoodLog } from '@/lib/services/foodService';
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

  if (typeof id !== 'string' || typeof date !== 'string' || !isIsoDate(date)) {
    return NextResponse.redirect(new URL(`/diary?err=${encodeURIComponent('ข้อมูลไม่ถูกต้อง')}`, getRequestOrigin(request)));
  }

  await deleteFoodLog({ userId: DEFAULT_USER_ID, id });
  return NextResponse.redirect(new URL(`/diary?date=${date}`, getRequestOrigin(request)));
}
