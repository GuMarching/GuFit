'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const isActive = (pathname: string, href: string) => {
  const cleanHref = href.split('?')[0] ?? href;
  if (href === '/') return pathname === '/' || pathname === '/dashboard';
  if (href === '/dashboard') return pathname === '/' || pathname === '/dashboard';
  return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
};

const NavIcon = (p: { name: 'home' | 'diary' | 'weight' | 'profile'; active: boolean }) => {
  const cls = p.active ? 'stroke-emerald-600' : 'stroke-gray-500';
  if (p.name === 'home') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 ${cls}`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M9 21v-7h6v7" />
      </svg>
    );
  }
  if (p.name === 'diary') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 ${cls}`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3h10a2 2 0 0 1 2 2v16a0 0 0 0 1 0 0H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
        <path d="M9 7h6" />
        <path d="M9 11h6" />
        <path d="M9 15h4" />
      </svg>
    );
  }
  if (p.name === 'profile') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 ${cls}`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21a8 8 0 0 0-16 0" />
        <path d="M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`h-5 w-5 ${cls}`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 6h10" />
      <path d="M7 10h10" />
      <path d="M7 14h10" />
      <path d="M7 18h10" />
      <path d="M5 4v16" />
      <path d="M19 4v16" />
    </svg>
  );
};

export const BottomNav = () => {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const searchParams = useSearchParams();

  const todayIso = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const items = [
    { href: '/dashboard', label: 'หน้าแรก', icon: 'home' as const },
    { href: '/diary', label: 'ไดอารี่', icon: 'diary' as const },
    { href: '/weight', label: 'น้ำหนัก', icon: 'weight' as const },
    { href: '/profile', label: 'โปรไฟล์', icon: 'profile' as const },
  ];

  const currentDiaryDate = pathname.startsWith('/diary') ? searchParams?.get('date') : null;
  const date = currentDiaryDate && /^\d{4}-\d{2}-\d{2}$/.test(currentDiaryDate) ? currentDiaryDate : todayIso();

  return (
    <>
      <button
        type="button"
        onClick={() => router.push(`/diary?date=${date}&add=1`)}
        className="fixed left-1/2 z-[80] -translate-x-1/2"
        style={{ bottom: 'calc(18px + env(safe-area-inset-bottom))' }}
        aria-label="เพิ่มอาหารหรือกิจกรรม"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 stroke-white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </div>
      </button>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-md">
          <div className="grid grid-cols-4 px-2 py-2">
            {items.map((it, idx) => {
              const active = isActive(pathname, it.href);
              const pad = idx === 1 ? 'pr-8' : idx === 2 ? 'pl-8' : '';
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={
                    (active
                      ? 'mx-1 flex flex-col items-center gap-1 rounded-2xl bg-emerald-50 px-2 py-2 text-[11px] font-semibold text-emerald-700'
                      : 'mx-1 flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold text-gray-700 hover:bg-gray-50') +
                    ` ${pad}`
                  }
                >
                  <NavIcon name={it.icon} active={active} />
                  <span>{it.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
};
