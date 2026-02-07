import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

import { readSupabaseEnv } from '@/lib/supabase/client';

export const createSupabaseServerClient = (cookies: {
  getAll(): { name: string; value: string }[];
  setAll(cookies: { name: string; value: string; options?: CookieOptions }[]): void;
}) => {
  const env = readSupabaseEnv();
  if (!env) {
    throw new Error('Supabase is disabled or missing env (NEXT_PUBLIC_FORCE_LOCAL=1 or missing SUPABASE envs)');
  }

  return createServerClient(env.url, env.anonKey, { cookies });
};

export const createSupabaseServerClientReadonly = (cookies: {
  getAll(): { name: string; value: string }[];
}) => {
  const env = readSupabaseEnv();
  if (!env) {
    throw new Error('Supabase is disabled or missing env (NEXT_PUBLIC_FORCE_LOCAL=1 or missing SUPABASE envs)');
  }

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: cookies.getAll,
      setAll: () => {
        // No-op in Server Components (cookies() is read-only). Middleware/Route handlers will persist.
      },
    },
  });
};
