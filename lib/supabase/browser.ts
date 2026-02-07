import { createBrowserClient } from '@supabase/ssr';

import { readSupabaseEnv } from '@/lib/supabase/client';

export const createSupabaseBrowserClient = () => {
  const env = readSupabaseEnv();
  if (!env) throw new Error('Supabase is disabled or missing env (NEXT_PUBLIC_FORCE_LOCAL=1 or missing SUPABASE envs)');
  return createBrowserClient(env.url, env.anonKey);
};
