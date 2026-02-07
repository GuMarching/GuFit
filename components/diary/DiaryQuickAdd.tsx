'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { CatalogFood } from '@/lib/constants/foodCatalogTh';
import { FOOD_CATALOG_TH } from '@/lib/constants/foodCatalogTh';

type Mode =
  | 'menu'
  | 'food'
  | 'food_manual'
  | 'food_catalog'
  | 'food_ai'
  | 'ai_food'
  | 'ai_photo'
  | 'exercise_ai';

type EstimatedFood = {
  foodName: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

const safeMsg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : String(e ?? fallback));

const fileToResizedJpeg = async (file: File, opts?: { maxDim?: number; quality?: number }): Promise<File> => {
  const maxDim = opts?.maxDim ?? 1280;
  const quality = opts?.quality ?? 0.78;

  if (typeof window === 'undefined') return file;
  if (!file.type.startsWith('image/')) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = await createImageBitmap(file);
    const w = img.width;
    const h = img.height;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    const outW = Math.max(1, Math.round(w * scale));
    const outH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, outW, outH);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality));
    if (!blob) return file;

    const name = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
};

type DetectedFood = {
  foodName: string;
  defaultUnit: string;
  unitOptions: string[];
};

const Spinner = (props: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`h-4 w-4 animate-spin ${props.className ?? ''}`} fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4z" />
  </svg>
);

const DiaryQuickAddSheet = (p: { title: string; onClose: () => void; children: ReactNode }) => {
  const navBottom = 'calc(72px + env(safe-area-inset-bottom))';
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute left-0 right-0 top-0 bg-black/30"
        style={{ bottom: navBottom }}
        onClick={p.onClose}
        aria-label="ปิด"
      />
      <div
        className="absolute left-0 right-0 mx-auto w-full max-w-md rounded-t-3xl border border-gray-100 bg-white/90 p-4 shadow-2xl backdrop-blur overscroll-contain"
        style={{ bottom: navBottom }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-extrabold tracking-tight text-gray-900">{p.title}</div>
          <button
            type="button"
            onClick={p.onClose}
            className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-extrabold text-gray-900 shadow-sm transition hover:bg-gray-50 active:translate-y-px active:scale-[0.99]"
          >
            ปิด
          </button>
        </div>
        <div className="max-h-[75vh] overflow-auto overscroll-contain">{p.children}</div>
      </div>
    </div>
  );
};

const TileIconWrap = (p: { children: ReactNode }) => (
  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-sm">
    {p.children}
  </div>
);

const tileCls =
  'group rounded-3xl border border-gray-100 bg-white/80 px-4 py-5 text-center text-sm font-extrabold text-gray-900 shadow-sm transition hover:bg-white active:translate-y-px active:scale-[0.99] disabled:opacity-60';

const tileIconCls =
  'h-6 w-6 stroke-gray-700 transition-colors group-hover:stroke-teal-700 group-focus-visible:stroke-teal-700';

export const DiaryQuickAdd = (props: {
  geminiEnabled: boolean;
  date: string;
  initialOpen?: boolean;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(Boolean(props.initialOpen));
  const [mode, setMode] = useState<Mode>('menu');
  const [photo, setPhoto] = useState<File | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<DetectedFood | null>(null);
  const amountRef = useRef('');
  const [amountSnapshot, setAmountSnapshot] = useState('');
  const [unit, setUnit] = useState('กรัม');
  const [notes, setNotes] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [estimateErr, setEstimateErr] = useState<string | null>(null);
  const [estimated, setEstimated] = useState<EstimatedFood | null>(null);

  const foodTextRef = useRef('');

  const exerciseNameRef = useRef('');
  const exerciseMinutesRef = useRef('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const suppressAutoOpenRef = useRef(false);

  const catalog = useMemo(() => FOOD_CATALOG_TH, []);

  const addParam = searchParams?.get('add');

  const validEstimated = useMemo(() => {
    if (!estimated) return null;
    const allZero =
      Number(estimated.calories) <= 0 &&
      Number(estimated.protein) <= 0 &&
      Number(estimated.fat) <= 0 &&
      Number(estimated.carbs) <= 0;
    const badNumber =
      !Number.isFinite(Number(estimated.calories)) ||
      !Number.isFinite(Number(estimated.protein)) ||
      !Number.isFinite(Number(estimated.fat)) ||
      !Number.isFinite(Number(estimated.carbs));
    return allZero || badNumber ? null : estimated;
  }, [estimated]);

  const close = () => {
    suppressAutoOpenRef.current = true;
    setOpen(false);
    setMode('menu');
    setPhoto(null);
    setDetecting(false);
    setDetected(null);
    amountRef.current = '';
    setAmountSnapshot('');
    setUnit('กรัม');
    setNotes('');
    setEstimating(false);
    setEstimateErr(null);
    setEstimated(null);
    foodTextRef.current = '';
    exerciseNameRef.current = '';
    exerciseMinutesRef.current = '';

    if (addParam) {
      const next = new URLSearchParams(searchParams?.toString() ?? '');
      next.delete('add');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : `${pathname}`);
    }
  };

  const submitTextEstimate = async () => {
    const text = foodTextRef.current.trim();
    if (!text) return;
    setEstimating(true);
    setEstimateErr(null);
    setEstimated(null);
    try {
      const fd = new FormData();
      fd.set('date', props.date);
      fd.set('text', text);
      fd.set('preview', '1');
      const res = await fetch('/api/diary/food/ai-estimate', {
        method: 'POST',
        body: fd,
      });
      const data: unknown = await res.json();
      const rec = (data && typeof data === 'object' ? (data as Record<string, unknown>) : null);
      if (!res.ok || rec?.error) {
        throw new Error(String((rec?.error as unknown) ?? 'ไม่สามารถเรียก AI ได้'));
      }

      const est = (rec?.estimated && typeof rec.estimated === 'object' ? (rec.estimated as Record<string, unknown>) : null);

      const next = {
        foodName: String(est?.foodName ?? 'อาหาร'),
        calories: Number(est?.calories ?? 0),
        protein: Number(est?.protein ?? 0),
        fat: Number(est?.fat ?? 0),
        carbs: Number(est?.carbs ?? 0),
      };
      const allZero = next.calories <= 0 && next.protein <= 0 && next.fat <= 0 && next.carbs <= 0;
      const badNumber =
        !Number.isFinite(next.calories) || !Number.isFinite(next.protein) || !Number.isFinite(next.fat) || !Number.isFinite(next.carbs);
      if (allZero || badNumber) {
        throw new Error('AI ประเมินไม่ได้ (ผลลัพธ์เป็น 0) กรุณาลองพิมพ์ละเอียดขึ้น หรือกดประเมินใหม่');
      }

      setEstimated(next);
    } catch (e: unknown) {
      setEstimateErr(safeMsg(e, 'ไม่สามารถเรียก AI ได้'));
    } finally {
      setEstimating(false);
    }
  };

  useEffect(() => {
    if (!props.initialOpen) return;
    setOpen(true);
    setMode('menu');
  }, [props.initialOpen]);

  useEffect(() => {
    if (!addParam) return;
    if (suppressAutoOpenRef.current) return;
    // Important: don't reset `mode` on re-renders (typing) while the sheet is already open.
    if (open) return;
    setOpen(true);
    setMode('menu');
  }, [addParam, open, searchParams]);

  useEffect(() => {
    if (addParam) return;
    suppressAutoOpenRef.current = false;
  }, [addParam]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = 'hidden';
    // Prevent layout shift when scrollbar disappears.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (mode !== 'ai_photo') return;
    // Open camera/file picker immediately upon entering the mode (works on mobile; desktop will show file chooser).
    fileInputRef.current?.click();
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    if (mode !== 'ai_food' && mode !== 'ai_photo') return;
    setEstimateErr(null);
    setEstimated(null);
    setEstimating(false);
  }, [open, mode]);

  const setLocalDetectedFallback = () => {
    setDetecting(false);
    setEstimateErr(null);
    setEstimated(null);
    amountRef.current = '';
    setAmountSnapshot('');

    const unitOptions = ['กรัม', 'มล.', 'ชิ้น', 'จาน', 'ถ้วย'];
    const defaultUnit = unitOptions[0]!;
    setDetected({
      foodName: 'อาหารจากรูป',
      defaultUnit,
      unitOptions,
    });
    setUnit(defaultUnit);
  };

  const submitPhotoEstimate = async () => {
    if (!photo) return;
    setEstimating(true);
    setEstimateErr(null);
    setEstimated(null);
    try {
      const prepared = await fileToResizedJpeg(photo);
      const fd = new FormData();
      fd.set('date', props.date);
      fd.set('image', prepared);
      const amt = amountRef.current.trim();
      setAmountSnapshot(amt);
      if (amt) fd.set('amount', amt);
      if (unit.trim()) fd.set('unit', unit.trim());
      if (notes.trim()) fd.set('text', notes.trim());

      const res = await fetch('/api/diary/food/ai-estimate-image', {
        method: 'POST',
        body: fd,
      });
      const data: unknown = await res.json();
      const rec = (data && typeof data === 'object' ? (data as Record<string, unknown>) : null);
      if (!res.ok) {
        throw new Error(String((rec?.error as unknown) ?? 'ไม่สามารถเรียก AI ได้'));
      }

      const est = (rec?.estimated && typeof rec.estimated === 'object' ? (rec.estimated as Record<string, unknown>) : null);

      const next = {
        foodName: String(est?.foodName ?? detected?.foodName ?? 'อาหารจากรูป'),
        calories: Number(est?.calories ?? 0),
        protein: Number(est?.protein ?? 0),
        fat: Number(est?.fat ?? 0),
        carbs: Number(est?.carbs ?? 0),
      };
      const allZero = next.calories <= 0 && next.protein <= 0 && next.fat <= 0 && next.carbs <= 0;
      const badNumber =
        !Number.isFinite(next.calories) || !Number.isFinite(next.protein) || !Number.isFinite(next.fat) || !Number.isFinite(next.carbs);
      if (allZero || badNumber) {
        throw new Error('AI ประเมินไม่ได้ (ผลลัพธ์เป็น 0) กรุณาลองถ่ายใหม่ หรือใส่รายละเอียดเพิ่ม');
      }

      setEstimated(next);
    } catch (e: unknown) {
      setEstimateErr(safeMsg(e, 'ไม่สามารถเรียก AI ได้'));
    } finally {
      setEstimating(false);
    }
  };

  return (
    <>
      {open ? (
        mode === 'menu' ? (
          <DiaryQuickAddSheet title="เพิ่มรายการ" onClose={close}>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={tileCls}
                onClick={() => setMode('ai_photo')}
                disabled={!props.geminiEnabled}
              >
                <TileIconWrap>
                  <svg viewBox="0 0 24 24" fill="none" className={tileIconCls} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h4l2-2h4l2 2h4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
                    <path d="M12 17a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" />
                  </svg>
                </TileIconWrap>
                สแกนอาหาร
              </button>

              <button
                type="button"
                className={tileCls}
                onClick={() => setMode('ai_food')}
              >
                <TileIconWrap>
                  <svg viewBox="0 0 24 24" fill="none" className={tileIconCls} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                    <path d="M8 8h8" />
                    <path d="M8 12h8" />
                    <path d="M8 16h6" />
                  </svg>
                </TileIconWrap>
                ค้นหาอาหาร
              </button>

              <button
                type="button"
                className={tileCls}
                onClick={() => setMode('exercise_ai')}
                disabled={!props.geminiEnabled}
              >
                <TileIconWrap>
                  <svg viewBox="0 0 24 24" fill="none" className={tileIconCls} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 12h12" />
                    <path d="M7 8h2" />
                    <path d="M15 8h2" />
                    <path d="M7 16h2" />
                    <path d="M15 16h2" />
                    <path d="M9 8l6 8" />
                  </svg>
                </TileIconWrap>
                บันทึกกิจกรรม
              </button>

              <button
                type="button"
                className={tileCls}
                onClick={() => setMode('food_manual')}
              >
                <TileIconWrap>
                  <svg viewBox="0 0 24 24" fill="none" className={tileIconCls} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </TileIconWrap>
                บันทึกด่วน
              </button>
            </div>
          </DiaryQuickAddSheet>
        ) : mode === 'food' ? (
          <DiaryQuickAddSheet title="เพิ่มอาหาร" onClose={close}>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="rounded-3xl border border-gray-100 bg-white/80 px-4 py-5 text-left text-sm font-extrabold text-gray-900 shadow-sm transition hover:bg-white active:translate-y-px active:scale-[0.99]"
                onClick={() => setMode('food_manual')}
              >
                เพิ่มอาหารด้วยตัวเอง
                <div className="mt-1 text-xs font-medium text-gray-600">กรอกข้อมูลเอง</div>
              </button>
              <button
                type="button"
                className="rounded-3xl border border-gray-100 bg-white/80 px-4 py-5 text-left text-sm font-extrabold text-gray-900 shadow-sm transition hover:bg-white active:translate-y-px active:scale-[0.99]"
                onClick={() => setMode('food_catalog')}
              >
                เลือกจากรายการ
                <div className="mt-1 text-xs font-medium text-gray-600">ฐานข้อมูลในเครื่อง</div>
              </button>
              <button
                type="button"
                className="col-span-2 rounded-3xl border border-teal-100 bg-teal-50/60 px-4 py-5 text-left text-sm font-extrabold text-gray-900 shadow-sm transition hover:bg-teal-50 active:translate-y-px active:scale-[0.99] disabled:opacity-60"
                onClick={() => setMode('food_ai')}
                disabled={!props.geminiEnabled}
              >
                เพิ่มอาหารด้วย AI
                <div className="mt-1 text-xs font-medium text-gray-600">ข้อความ หรือ รูปภาพ</div>
              </button>
            </div>
          </DiaryQuickAddSheet>
        ) : mode === 'food_ai' ? (
          <DiaryQuickAddSheet title="เพิ่มอาหารด้วย AI" onClose={close}>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={tileCls.replace('text-center', 'text-left')}
                onClick={() => setMode('ai_food')}
                disabled={!props.geminiEnabled}
              >
                <TileIconWrap>
                  <svg viewBox="0 0 24 24" fill="none" className={tileIconCls} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                    <path d="M8 8h8" />
                    <path d="M8 12h8" />
                    <path d="M8 16h6" />
                  </svg>
                </TileIconWrap>
                AI ข้อความ
                <div className="mt-1 text-xs font-medium text-gray-600">พิมพ์รายละเอียดอาหาร</div>
              </button>
              <button
                type="button"
                className={tileCls.replace('text-center', 'text-left')}
                onClick={() => setMode('ai_photo')}
                disabled={!props.geminiEnabled}
              >
                <TileIconWrap>
                  <svg viewBox="0 0 24 24" fill="none" className={tileIconCls} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h4l2-2h4l2 2h4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
                    <path d="M12 17a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" />
                  </svg>
                </TileIconWrap>
                AI รูปภาพ
                <div className="mt-1 text-xs font-medium text-gray-600">ถ่ายรูปหรือเลือกรูป</div>
              </button>
            </div>
          </DiaryQuickAddSheet>
        ) : mode === 'food_manual' ? (
          <DiaryQuickAddSheet title="เพิ่มอาหาร (กรอกเอง)" onClose={close}>
            <form action="/api/diary/food/add" method="post" className="space-y-3">
              <input type="hidden" name="date" value={props.date} />
              <input
                name="foodName"
                placeholder="ชื่ออาหาร"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="calories"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="แคลอรี่"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
                  required
                />
                <input
                  name="protein"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="โปรตีน (g)"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
                  required
                />
                <input
                  name="fat"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="ไขมัน (g)"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
                  required
                />
                <input
                  name="carbs"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="คาร์บ (g)"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
                  required
                />
              </div>
              <button className="w-full rounded-2xl bg-teal-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition active:translate-y-px active:scale-[0.99] hover:bg-teal-600">
                เพิ่ม
              </button>
            </form>
          </DiaryQuickAddSheet>
        ) : mode === 'food_catalog' ? (
          <DiaryQuickAddSheet title="เลือกจากรายการอาหาร" onClose={close}>
            <div className="space-y-3">
              <div className="text-xs text-gray-600">เลือก 1 รายการเพื่อเพิ่มลงไดอารี่</div>
              <ul className="max-h-[50vh] space-y-2 overflow-auto">
                {catalog.map((f: CatalogFood) => (
                  <li key={f.name} className="rounded-2xl border bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{f.name}</div>
                        <div className="text-xs text-gray-600">
                          {f.calories} แคล · โปรตีน {f.protein}g · ไขมัน {f.fat}g · คาร์บ {f.carbs}g
                        </div>
                      </div>
                      <form action="/api/diary/food/add" method="post">
                        <input type="hidden" name="date" value={props.date} />
                        <input type="hidden" name="foodName" value={f.name} />
                        <input type="hidden" name="calories" value={String(f.calories)} />
                        <input type="hidden" name="protein" value={String(f.protein)} />
                        <input type="hidden" name="fat" value={String(f.fat)} />
                        <input type="hidden" name="carbs" value={String(f.carbs)} />
                        <button className="rounded-2xl bg-teal-700 px-3 py-2 text-sm font-extrabold text-white shadow-sm transition active:translate-y-px active:scale-[0.99] hover:bg-teal-600">
                          เพิ่ม
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </DiaryQuickAddSheet>
        ) : mode === 'exercise_ai' ? (
          <DiaryQuickAddSheet title="เพิ่มกิจกรรม AI" onClose={close}>
            {props.geminiEnabled ? (
              <form action="/api/diary/exercise/ai-estimate" method="post" className="space-y-3">
                <input type="hidden" name="date" value={props.date} />
                <input
                  name="name"
                  defaultValue=""
                  onChange={(e) => {
                    exerciseNameRef.current = e.target.value;
                  }}
                  placeholder="กิจกรรม เช่น วิ่ง, คาดิโอ, เดินเร็ว"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
                  required
                />
                <input
                  name="minutes"
                  defaultValue=""
                  onChange={(e) => {
                    exerciseMinutesRef.current = e.target.value;
                  }}
                  inputMode="numeric"
                  placeholder="นาที เช่น 30"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-600/20"
                  required
                />
                <button className="w-full rounded-2xl bg-teal-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition active:translate-y-px active:scale-[0.99] hover:bg-teal-600">
                  ประเมินและเพิ่ม
                </button>
                <div className="text-xs text-gray-600">ระบบจะประเมิน kcal ที่เผาผลาญและเพิ่มลงไดอารี่</div>
              </form>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-semibold">ยังไม่พร้อมใช้งาน</div>
                <div className="text-sm text-gray-600">กรุณาตั้งค่า `GEMINI_API_KEY` ในไฟล์ `.env.local`</div>
              </div>
            )}
          </DiaryQuickAddSheet>
        ) : mode === 'ai_food' ? (
          <DiaryQuickAddSheet title="ค้นหาอาหาร" onClose={close}>
            {props.geminiEnabled ? (
              <div className="space-y-3">
                <textarea
                  defaultValue=""
                  onChange={(e) => {
                    foodTextRef.current = e.target.value;
                  }}
                  placeholder="พิมพ์รายละเอียด เช่น กะเพราไก่+ไข่ดาว ไม่กินไข่แดง"
                  className="min-h-[104px] w-full rounded-xl border px-3 py-2 text-base"
                  required
                />
                <button
                  type="button"
                  className="w-full rounded-2xl bg-teal-700 px-4 py-2.5 text-base font-extrabold text-white shadow-sm transition active:translate-y-px active:scale-[0.99] hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={submitTextEstimate}
                  disabled={estimating}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {estimating ? <Spinner className="text-white" /> : null}
                    <span>{estimating ? 'กำลังประเมิน…' : 'ประเมิน'}</span>
                  </span>
                </button>
                <div className="text-xs text-gray-600">AI จะประเมินจากข้อความและแสดงผลก่อนบันทึก</div>

                {estimateErr ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {estimateErr}
                  </div>
                ) : null}

                {validEstimated ? (
                  <div className="space-y-3 rounded-2xl border bg-white p-3">
                    <div className="text-sm font-semibold">ผลการประเมิน</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl border bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-600">แคลอรี่</div>
                        <div className="font-semibold">{validEstimated.calories} kcal</div>
                      </div>
                      <div className="rounded-xl border bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-600">โปรตีน</div>
                        <div className="font-semibold">{validEstimated.protein} g</div>
                      </div>
                      <div className="rounded-xl border bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-600">ไขมัน</div>
                        <div className="font-semibold">{validEstimated.fat} g</div>
                      </div>
                      <div className="rounded-xl border bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-600">คาร์บ</div>
                        <div className="font-semibold">{validEstimated.carbs} g</div>
                      </div>
                    </div>
                    <form action="/api/diary/food/add" method="post">
                      <input type="hidden" name="date" value={props.date} />
                      <input type="hidden" name="foodName" value={validEstimated.foodName} />
                      <input type="hidden" name="calories" value={String(validEstimated.calories)} />
                      <input type="hidden" name="protein" value={String(validEstimated.protein)} />
                      <input type="hidden" name="fat" value={String(validEstimated.fat)} />
                      <input type="hidden" name="carbs" value={String(validEstimated.carbs)} />
                      <button className="w-full rounded-2xl bg-teal-700 px-4 py-2.5 text-base font-extrabold text-white shadow-sm transition active:translate-y-px active:scale-[0.99] hover:bg-teal-600">
                        บันทึกลงไดอารี่
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-semibold">ยังไม่พร้อมใช้งาน</div>
                <div className="text-sm text-gray-600">กรุณาตั้งค่า `GEMINI_API_KEY` ในไฟล์ `.env.local`</div>
              </div>
            )}
          </DiaryQuickAddSheet>
        ) : mode === 'ai_photo' ? (
          <DiaryQuickAddSheet title="AI ถ่ายรูปอาหาร" onClose={close}>
            {props.geminiEnabled ? (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0] ?? null;
                    setPhoto(null);
                    setEstimated(null);
                    setEstimateErr(null);
                    setDetected(null);
                    if (!f) return;

                    setDetecting(true);
                    try {
                      const prepared = await fileToResizedJpeg(f);
                      setPhoto(prepared);
                    } finally {
                      setLocalDetectedFallback();
                    }
                  }}
                />

                <button
                  type="button"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-900 shadow-sm transition active:translate-y-px active:scale-[0.99] hover:bg-gray-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  ถ่ายรูป/เลือกรูปใหม่
                </button>

                {detecting ? (
                  <div className="text-sm text-gray-700">กำลังเตรียม…</div>
                ) : detected ? (
                  <div className="rounded-2xl border bg-white p-3">
                    <div className="text-sm font-semibold">พบอาหาร: {detected.foodName}</div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <input
                        defaultValue=""
                        onChange={(e) => {
                          amountRef.current = e.target.value;
                        }}
                        inputMode="decimal"
                        placeholder="ปริมาณ เช่น 100"
                        className="w-full rounded-xl border px-3 py-2 text-base"
                      />
                      <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full rounded-xl border bg-white px-3 py-2 text-base"
                      >
                        {detected.unitOptions.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>

                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="รายละเอียดเพิ่มเติม (ฟรีสไตล์) เช่น ไม่กินไข่แดง / ไม่ใส่น้ำตาล"
                      className="mt-3 min-h-[88px] w-full rounded-xl border px-3 py-2 text-base"
                    />

                    <button
                      type="button"
                      className="mt-3 w-full rounded-2xl bg-teal-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition active:translate-y-px active:scale-[0.99] hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={submitPhotoEstimate}
                      disabled={!photo || estimating}
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        {estimating ? <Spinner className="text-white" /> : null}
                        <span>{estimating ? 'กำลังประเมิน…' : 'ประเมิน'}</span>
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-700">กำลังรอรูปภาพ</div>
                )}

                {estimateErr ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {estimateErr}
                  </div>
                ) : null}

                {validEstimated ? (
                  <div className="space-y-3 rounded-2xl border bg-white p-3">
                    <div className="text-sm font-semibold">ผลการประเมิน</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl border bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-600">แคลอรี่</div>
                        <div className="font-semibold">{validEstimated.calories} kcal</div>
                      </div>
                      <div className="rounded-xl border bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-600">โปรตีน</div>
                        <div className="font-semibold">{validEstimated.protein} g</div>
                      </div>
                      <div className="rounded-xl border bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-600">ไขมัน</div>
                        <div className="font-semibold">{validEstimated.fat} g</div>
                      </div>
                      <div className="rounded-xl border bg-gray-50 px-3 py-2">
                        <div className="text-xs text-gray-600">คาร์บ</div>
                        <div className="font-semibold">{validEstimated.carbs} g</div>
                      </div>
                    </div>
                    <form action="/api/diary/food/add" method="post">
                      <input type="hidden" name="date" value={props.date} />
                      <input
                        type="hidden"
                        name="foodName"
                        value={
                          amountSnapshot.trim()
                            ? `${validEstimated.foodName} (${amountSnapshot.trim()} ${unit})`
                            : validEstimated.foodName
                        }
                      />
                      <input type="hidden" name="calories" value={String(validEstimated.calories)} />
                      <input type="hidden" name="protein" value={String(validEstimated.protein)} />
                      <input type="hidden" name="fat" value={String(validEstimated.fat)} />
                      <input type="hidden" name="carbs" value={String(validEstimated.carbs)} />
                      <button className="w-full rounded-2xl bg-teal-700 px-4 py-2.5 text-base font-extrabold text-white shadow-sm transition active:translate-y-px active:scale-[0.99] hover:bg-teal-600">
                        บันทึกลงไดอารี่
                      </button>
                    </form>
                    <div className="text-xs text-gray-600">ระบบไม่เก็บรูปภาพไว้</div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-gray-700">ยังไม่ได้ตั้งค่า GEMINI_API_KEY</div>
            )}
          </DiaryQuickAddSheet>
        ) : null
      ) : null}
    </>
  );
};
