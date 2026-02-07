'use client';

import { useSearchParams } from 'next/navigation';

import { Card, Button } from '@/components/ui';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export const LoginClient = () => {
  const searchParams = useSearchParams();
  const next = searchParams?.get('next') ?? '/dashboard';
  const err = searchParams?.get('err');

  const signIn = async () => {
    const sb = createSupabaseBrowserClient();
    await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">เข้าสู่ระบบ</h1>
      <Card title="Google Login">
        {err ? <div className="text-sm text-red-700">{err}</div> : null}
        <div className="mt-3">
          <Button type="button" onClick={signIn}>
            เข้าสู่ระบบด้วย Google
          </Button>
        </div>
      </Card>
    </div>
  );
};
