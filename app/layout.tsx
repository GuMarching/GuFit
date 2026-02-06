import './globals.css';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';

import { BottomNav } from '@/components/BottomNav';

export const metadata = {
  title: 'GuFit - แอพนับแคลอรี่ (ออฟไลน์)',
  description: 'ระบบติดตามแคลอรี่และลดน้ำหนักแบบ local-first (ออฟไลน์) พร้อมต่อ Supabase ในอนาคต',
};

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-dvh bg-gray-50">
        <div className="mx-auto min-h-dvh w-full max-w-md bg-gray-50">
          <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-3">
              <Link href="/dashboard" className="text-base font-semibold tracking-tight text-gray-900">
                GuFit
              </Link>
              <div className="text-sm font-medium text-gray-700"> </div>
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
