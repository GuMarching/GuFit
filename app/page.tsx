import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { isSupabaseEnabled } from '@/lib/supabase/client';
import { createSupabaseServerClientReadonly } from '@/lib/supabase/server';

export default async function HomePage() {
  if (isSupabaseEnabled()) {
    const cookieStore = await cookies();
    const sb = createSupabaseServerClientReadonly({
      getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
    });

    const { data } = await sb.auth.getUser();
    redirect(data.user ? '/dashboard' : '/login');
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">แอพนับแคลอรี่</h1>
      <p className="text-sm text-gray-700">
        ติดตามแคลอรี่ น้ำหนัก และกิจกรรม พร้อมระบบล็อกอิน
      </p>
      <div className="flex gap-3">
        <Link href="/profile" className="rounded bg-gray-900 px-4 py-2 text-white">
          ตั้งค่าโปรไฟล์
        </Link>
        <Link href="/dashboard" className="rounded border px-4 py-2">
          ไปหน้าแรก
        </Link>
      </div>
    </div>
  );
}
