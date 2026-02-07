'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

const Spinner = (props: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`h-4 w-4 animate-spin ${props.className ?? ''}`} fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4z" />
  </svg>
);

export default function ConfirmSubmitDanger(props: {
  label: string;
  confirmTitle?: string;
  confirmText?: string;
}) {
  const [open, setOpen] = useState(false);
  const { pending } = useFormStatus();

  const title = props.confirmTitle ?? 'ยืนยันการลบ';
  const text = props.confirmText ?? 'ต้องการลบรายการนี้จริงหรือไม่?';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const toneCls = useMemo(
    () =>
      'rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-rose-500 active:translate-y-px active:scale-[0.99]',
    [],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-extrabold text-rose-800 shadow-sm transition hover:bg-rose-100 active:translate-y-px active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {props.label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            onClick={() => setOpen(false)}
            aria-label="ปิด"
          />
          <div className="absolute left-0 right-0 top-1/2 mx-auto w-full max-w-md -translate-y-1/2 px-4">
            <div className="rounded-3xl border border-gray-100 bg-white/95 p-4 shadow-2xl backdrop-blur">
              <div className="text-base font-extrabold text-gray-900">{title}</div>
              <div className="mt-1 text-sm font-semibold text-gray-700">{text}</div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-900 shadow-sm transition hover:bg-gray-50 active:translate-y-px active:scale-[0.99]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className={`${toneCls} disabled:cursor-not-allowed disabled:opacity-60`}
                  disabled={pending}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {pending ? <Spinner className="text-white" /> : null}
                    <span>{pending ? 'กำลังลบ…' : 'ลบ'}</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
