import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

export const createSupabaseServerClient = (cookies: {
  getAll(): { name: string; value: string }[];
  setAll(cookies: { name: string; value: string; options?: CookieOptions }[]): void;
}) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createServerClient(url, anonKey, { cookies });
};

export const createSupabaseServerClientReadonly = (cookies: {
  getAll(): { name: string; value: string }[];
}) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: cookies.getAll,
      setAll: () => {
        // No-op in Server Components (cookies() is read-only). Middleware/Route handlers will persist.
      },
    },
  });
};
