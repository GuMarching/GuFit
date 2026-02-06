import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { createSupabaseServerClientReadonly } from '@/lib/supabase/server';

export const getUserIdOrRedirect = async (): Promise<string> => {
  const cookieStore = await cookies();
  const sb = createSupabaseServerClientReadonly({
    getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
  });

  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) redirect('/login');
  return data.user.id;
};
