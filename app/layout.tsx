import './globals.css';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';

import { BottomNav } from '@/components/BottomNav';
import { HeaderRight } from '@/components/header/HeaderRight';

export const metadata = {
  title: 'GuFit - แอพนับแคลอรี่',
  description: 'ติดตามแคลอรี่ น้ำหนัก และกิจกรรม พร้อมระบบล็อกอิน',
};

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-dvh">
        <div className="mx-auto min-h-dvh w-full max-w-md bg-transparent">
          <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-3">
              <Link href="/dashboard" className="text-lg font-extrabold tracking-tight text-gray-900">
                GuFit
              </Link>
              <Suspense fallback={<div className="h-9 w-9" />}>
                <HeaderRight />
              </Suspense>
            </div>
          </header>

          <main className="px-4 pb-24 pt-4">{props.children}</main>

          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
        </div>
      </body>
    </html>
  );
}
