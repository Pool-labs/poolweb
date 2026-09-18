import { cookies } from 'next/headers';

import { ADMIN_ENV_COOKIE } from '@/lib/admin/adminEnv';
import { resolveApiEnv } from '@/lib/admin/serverApi';
import { UsersScreen } from './UsersScreen';

/**
 * A server shell whose only job is to resolve the SELECTED environment and hand
 * it down (poolweb#46).
 *
 * The screen itself is a client component. It needs to know which environment
 * it is about to write to — "New user" says so, and warns in production — and
 * the env cookie is httpOnly on purpose, so the value comes from here rather
 * than from client JS. Same shape as `/admin/dashboard`.
 *
 * ⚠️ NOT a gate. This page is available in every environment; the page gates
 * that do exist (waitlist, QA) call `notFound()` here instead.
 */
export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const env = resolveApiEnv(cookieStore.get(ADMIN_ENV_COOKIE)?.value);
  return <UsersScreen env={env} />;
}
