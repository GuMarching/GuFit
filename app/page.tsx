import Link from 'next/link';

export default function HomePage() {
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
