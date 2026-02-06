import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { readSupabaseEnv } from '@/lib/supabase/client';

const PROTECTED_PREFIXES = ['/dashboard', '/diary', '/profile', '/weight'];

export async function middleware(request: NextRequest) {
  // If Supabase isn't configured yet (missing env), do not block the app.
  // This prevents a hard 500 during local development.
  if (!readSupabaseEnv()) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  const sb = createSupabaseServerClient({
    getAll: () => request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
    setAll: (cookies) => {
      for (const c of cookies) {
        response.cookies.set(c.name, c.value, c.options);
      }
    },
  });

  // Refresh session (sets cookies if needed)
  const {
    data: { user },
  } = await sb.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // If logged in and tries to visit /login, send them to dashboard
  if (pathname === '/login' && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
