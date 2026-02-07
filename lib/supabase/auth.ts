import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { createSupabaseServerClientReadonly } from '@/lib/supabase/server';
import { isSupabaseEnabled } from '@/lib/supabase/client';
import { DEFAULT_USER_ID } from '@/lib/constants/defaults';

export const getUserIdOrRedirect = async (): Promise<string> => {
  if (!isSupabaseEnabled()) return DEFAULT_USER_ID;

  const cookieStore = await cookies();
  const sb = createSupabaseServerClientReadonly({
    getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
  });

  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) redirect('/login');
  return data.user.id;
};
