import { createClient } from '@supabase/supabase-js';

type SupabaseEnv = {
  url: string;
  anonKey: string;
};

export const readSupabaseEnv = (): SupabaseEnv | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (url.trim().length === 0 || anonKey.trim().length === 0) return null;
  return { url: url.trim(), anonKey: anonKey.trim() };
};

export const isSupabaseEnabled = (): boolean => readSupabaseEnv() !== null;

export const supabase = () => {
  const env = readSupabaseEnv();
  if (!env) {
    throw new Error('Supabase env not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createClient(env.url, env.anonKey);
};
