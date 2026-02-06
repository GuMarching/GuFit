import { NextResponse } from 'next/server';

import { detectFoodFromImageWithGemini } from '@/lib/services/geminiService';
import type { IsoDateString } from '@/types/domain';

export const runtime = 'nodejs';

const isIsoDate = (v: string): v is IsoDateString => /^\d{4}-\d{2}-\d{2}$/.test(v);

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: Request) {
  const formData = await request.formData();

  const date = formData.get('date');
  const image = formData.get('image');

  if (typeof date !== 'string' || !isIsoDate(date)) {
    return NextResponse.json({ error: 'วันที่ไม่ถูกต้อง' }, { status: 400 });
  }

  if (!(image instanceof File)) {
    return NextResponse.json({ error: 'กรุณาเลือกรูปภาพ' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(image.type)) {
    return NextResponse.json({ error: 'รองรับเฉพาะไฟล์ JPG/PNG/WEBP' }, { status: 400 });
  }

  if (image.size > MAX_BYTES) {
    return NextResponse.json({ error: 'รูปใหญ่เกินไป (สูงสุด 5MB)' }, { status: 400 });
  }

  const arrayBuffer = await image.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  try {
    const detected = await detectFoodFromImageWithGemini({
      imageBase64: base64,
      mimeType: image.type,
    });

    return NextResponse.json({ date, detected });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e ?? 'ไม่สามารถเรียก AI ได้');
    // Fallback: let the user proceed even if detection fails.
    return NextResponse.json({
      date,
      detected: {
        foodName: 'อาหารจากรูป',
        defaultUnit: 'กรัม',
        unitOptions: ['กรัม', 'มล.', 'ชิ้น', 'จาน', 'ถ้วย'],
      },
      warning: msg,
    });
  }
}
