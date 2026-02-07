import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { BottomNav } from '@/components/BottomNav';
import { HeaderRight } from '@/components/header/HeaderRight';
import DashboardHeaderWeightLossDays from '@/components/header/DashboardHeaderWeightLossDays';
import RoutePrefetcher from '@/components/RoutePrefetcher';
import SplashVideo from '@/components/SplashVideo';
import ToastFromSearchParams from '@/components/ToastFromSearchParams';

export const metadata: Metadata = {
  title: 'GuFit - แอพนับแคลอรี่',
  description: 'ติดตามแคลอรี่ น้ำหนัก และกิจกรรม พร้อมระบบล็อกอิน',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
    ],
    apple: [{ url: '/apple-touch-icon.png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'GuFit',
    statusBarStyle: 'default',
  },
};

export const viewport = {
  themeColor: '#0f766e',
};

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-dvh">
        <div className="mx-auto min-h-dvh w-full max-w-md bg-transparent">
          <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-3">
              <Link href="/dashboard" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-gray-900">
                <Image src="/web-app-manifest-192x192.png" alt="GuFit" width={26} height={26} className="h-[26px] w-[26px]" priority />
                <span>GuFit</span>
              </Link>
              <Suspense fallback={null}>
                <div className="flex items-center gap-2">
                  <DashboardHeaderWeightLossDays />
                  <HeaderRight />
                </div>
              </Suspense>
            </div>
          </header>

          <Suspense fallback={null}>
            <ToastFromSearchParams />
          </Suspense>

          <Suspense fallback={null}>
            <RoutePrefetcher />
          </Suspense>

          <Suspense fallback={null}>
            <SplashVideo />
          </Suspense>

          <main className="px-4 pb-24 pt-4">{props.children}</main>

          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
        </div>
      </body>
    </html>
  );
}
