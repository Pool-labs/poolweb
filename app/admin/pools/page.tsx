import { cookies } from 'next/headers';

import { ADMIN_ENV_COOKIE } from '@/lib/admin/adminEnv';
import { resolveApiEnv } from '@/lib/admin/serverApi';
import { PoolsScreen } from './PoolsScreen';

/**
 * A server shell that resolves the selected environment for the screen — see
 * the note on `/admin/users/page.tsx` for why the client cannot read it itself.
 */
export default async function AdminPoolsPage() {
  const cookieStore = await cookies();
  const env = resolveApiEnv(cookieStore.get(ADMIN_ENV_COOKIE)?.value);
  return <PoolsScreen env={env} />;
}
