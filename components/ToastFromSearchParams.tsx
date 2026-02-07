'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const decodeParam = (v: string | null) => {
  if (!v) return null;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
};

export default function ToastFromSearchParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const ok = decodeParam(searchParams?.get('ok') ?? null);
  const err = decodeParam(searchParams?.get('err') ?? null);

  const toast = useMemo(() => {
    if (err) return { tone: 'error' as const, text: err };
    if (ok) return { tone: 'success' as const, text: ok };
    return null;
  }, [err, ok]);

  const [open, setOpen] = useState(Boolean(toast));

  useEffect(() => {
    setOpen(Boolean(toast));
  }, [toast]);

  const clearParams = () => {
    const next = new URLSearchParams(searchParams?.toString() ?? '');
    next.delete('ok');
    next.delete('err');
    const qs = next.toString();
    const base = pathname ?? '/';
    router.replace(qs ? `${base}?${qs}` : base);
  };

  useEffect(() => {
    if (!toast || !open) return;
    const t = window.setTimeout(() => {
      setOpen(false);
      clearParams();
    }, 2600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, open]);

  if (!toast || !open) return null;

  const cls =
    toast.tone === 'success'
      ? 'border-teal-200 bg-teal-50 text-teal-900'
      : 'border-rose-200 bg-rose-50 text-rose-900';

  return (
    <div className="fixed left-0 right-0 top-14 z-50 mx-auto w-full max-w-md px-4">
      <div className={`flex items-start justify-between gap-3 rounded-3xl border px-4 py-3 shadow-lg backdrop-blur ${cls}`}>
        <div className="min-w-0 text-sm font-semibold">{toast.text}</div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            clearParams();
          }}
          className="shrink-0 rounded-full border border-black/10 bg-white/60 px-3 py-1 text-xs font-extrabold text-gray-900 transition hover:bg-white active:translate-y-px"
        >
          ปิด
        </button>
      </div>
    </div>
  );
}
