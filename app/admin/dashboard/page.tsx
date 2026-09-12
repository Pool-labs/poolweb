import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { ADMIN_ENV_COOKIE } from '@/lib/admin/adminEnv';
import { resolveApiEnv } from '@/lib/admin/serverApi';
import { WaitlistDashboard } from './WaitlistDashboard';

/**
 * Production-only Waitlist surface (poolmobile #602).
 *
 * The waitlist does NOT go through the Pool API: it reads (and can DELETE)
 * pre-register signups straight from Firestore, and there is exactly ONE
 * Firebase project for every environment — the one holding the LIVE
 * marketing-site signups. The environment switcher (#112) changes
 * `POOL_API_BASE_URL` and has no effect on Firebase, so before this gate the
 * staging dashboard showed — under a banner promising "Test data only. Nothing
 * here is a real user" — real names and real email addresses, with a working
 * per-row delete.
 *
 * So this route exists only where the banner's promise is consistent with what
 * the tab shows: PRODUCTION, whose banner says everything here is real. Any
 * other selected environment 404s outright, before the client component (and
 * with it any Firestore read) is ever rendered. This is the exact inverse of
 * `/admin/qa`'s gate, for the exact inverse reason.
 *
 * The nav entry is a convenience only — typing the URL directly hits this gate.
 *
 * Decision recorded on #602: the waitlist is STILL COLLECTED (the public
 * `/preregister` page and API remain live; only the nav link was removed by
 * PoolWeb#21). Retiring the tab + exporting the data was considered and
 * declined for now — this surface stays, production-only.
 */
export default async function AdminWaitlistPage() {
  const cookieStore = await cookies();
  const env = resolveApiEnv(cookieStore.get(ADMIN_ENV_COOKIE)?.value);
  if (env !== 'production') notFound();
  return <WaitlistDashboard />;
}
