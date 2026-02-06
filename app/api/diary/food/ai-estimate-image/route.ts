import { NextResponse } from 'next/server';

import { estimateFoodFromImageWithGemini } from '@/lib/services/geminiService';
import type { IsoDateString } from '@/types/domain';

export const runtime = 'nodejs';

const isIsoDate = (v: string): v is IsoDateString => /^\d{4}-\d{2}-\d{2}$/.test(v);

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: Request) {
  const formData = await request.formData();

  const date = formData.get('date');
  const image = formData.get('image');
  const hintText = formData.get('text');
  const amount = formData.get('amount');
  const unit = formData.get('unit');

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
  const text = typeof hintText === 'string' ? hintText : undefined;
  const amountNum = typeof amount === 'string' && amount.trim() ? Number(amount) : null;
  const unitText = typeof unit === 'string' && unit.trim() ? unit.trim() : null;

  try {
    const estimated = await estimateFoodFromImageWithGemini({
      imageBase64: base64,
      mimeType: image.type,
      text,
      amount: typeof amountNum === 'number' && Number.isFinite(amountNum) ? amountNum : undefined,
      unit: unitText ?? undefined,
    });
    return NextResponse.json({ date, estimated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e ?? 'ไม่สามารถเรียก AI ได้');

    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid') || msg.includes('INVALID_ARGUMENT')) {
      return NextResponse.json(
        {
          error:
            'API key ของ Gemini ใช้งานไม่ได้ กรุณาตรวจสอบค่า GEMINI_API_KEY ใน Environment Variables (Vercel/เครื่อง) และเปิดใช้งาน Google AI Studio/Generative Language API ให้ถูกต้อง',
        },
        { status: 400 },
      );
    }

    // Handle quota/rate limit gracefully.
    if (msg.includes('Gemini error: 429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('exceeded your current quota')) {
      const retryMatch = msg.match(/retry in\s+([0-9]+(?:\.[0-9]+)?)s/i) ?? msg.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
      const retrySecondsRaw = retryMatch?.[1];
      const retrySeconds = retrySecondsRaw ? Math.max(1, Math.ceil(Number(retrySecondsRaw))) : null;
      const friendly =
        'AI โควต้าเต็ม/ถูกจำกัดการเรียกใช้งานชั่วคราว' +
        (retrySeconds ? ` กรุณารอประมาณ ${retrySeconds} วินาทีแล้วลองใหม่` : ' กรุณารอสักครู่แล้วลองใหม่') +
        ' (ถ้าใช้ Free tier อาจชน limit ได้ง่าย)';
      return NextResponse.json({ error: friendly, retrySeconds }, { status: 429 });
    }

    // Keep other errors.
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
