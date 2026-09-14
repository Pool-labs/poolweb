import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { ADMIN_ENV_COOKIE } from '@/lib/admin/adminEnv';
import { resolveApiEnv } from '@/lib/admin/serverApi';
import { WaitlistStats } from './WaitlistStats';

/**
 * Production-only waitlist statistics — the same gate as `/admin/dashboard`
 * (poolmobile #602), for the same reason: there is one Firestore project for
 * every environment, holding the LIVE marketing signups, so these numbers are
 * shown only under the production banner.
 *
 * This page gate decides what renders. The data itself is guarded separately
 * and authoritatively by `/admin/api/waitlist`, which re-checks the selected
 * environment and proves the session against the production API before any
 * Firestore read.
 */
export default async function AdminStatsPage() {
  const cookieStore = await cookies();
  const env = resolveApiEnv(cookieStore.get(ADMIN_ENV_COOKIE)?.value);
  if (env !== 'production') notFound();
  return <WaitlistStats />;
}
