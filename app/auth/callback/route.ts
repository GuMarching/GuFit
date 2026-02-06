import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(new URL('/login?err=missing_code', url.origin));
  }

  const cookieStore = await cookies();
  const response = NextResponse.redirect(new URL(next, url.origin));

  const sb = createSupabaseServerClient({
    getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
    setAll: (all) => {
      for (const c of all) response.cookies.set(c.name, c.value, c.options);
    },
  });

  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/login?err=${encodeURIComponent(error.message)}`, url.origin));
  }

  return response;
}
