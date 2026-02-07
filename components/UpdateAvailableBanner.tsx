'use client';

import { useEffect, useState } from 'react';

type VersionPayload = { version: string };

export default function UpdateAvailableBanner() {
  const [remote, setRemote] = useState<string | null>(null);
  const [local, setLocal] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLocal(localStorage.getItem('gufit_version') ?? null);
    } catch {
      setLocal(null);
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const r = await fetch('/api/version', { cache: 'no-store' });
        if (!r.ok) return;
        const data = (await r.json()) as VersionPayload;
        if (cancelled) return;
        if (typeof data?.version === 'string') {
          setRemote(data.version);
          try {
            if (!localStorage.getItem('gufit_version')) {
              localStorage.setItem('gufit_version', data.version);
              setLocal(data.version);
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    };

    poll();
    const t = window.setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  const show = !!remote && !!local && remote !== local;
  if (!show) return null;

  return (
    <div className="sticky top-[57px] z-20 mx-auto w-full max-w-md px-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold text-amber-900">มีเวอร์ชันใหม่ พร้อมอัปเดต</div>
          <button
            type="button"
            className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-sm"
            onClick={() => {
              try {
                localStorage.setItem('gufit_version', remote!);
              } catch {
                // ignore
              }
              window.location.reload();
            }}
          >
            รีเฟรช
          </button>
        </div>
      </div>
    </div>
  );
}
