import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { ADMIN_ENV_COOKIE } from '@/lib/admin/adminEnv';
import { resolveApiEnv } from '@/lib/admin/serverApi';
import { QaConsole } from '@/components/admin/qa/QaConsole';

/**
 * Staging-only QA console (poolmobile #132).
 *
 * TWO gates, both required:
 *  1. Here (server-side, first pass): if the SELECTED environment (#112) is
 *     production the route 404s outright — the page is never rendered and no QA
 *     request is ever issued. Reading the selection rather than a build-time
 *     constant is essential now that the environment can be switched at
 *     runtime: a stale compile-time check would leave the console reachable
 *     after a flip to production.
 *  2. In `QaConsole` (authoritative): `GET /qa/status` 404s whenever the API
 *     has the console disabled (killswitch + environment assertion), which the
 *     client treats as "disabled" and bounces away from.
 *
 * The nav entry is a convenience only — it is NOT a security boundary; typing
 * the URL directly hits both gates above.
 */
export default async function AdminQaPage() {
  const cookieStore = await cookies();
  const env = resolveApiEnv(cookieStore.get(ADMIN_ENV_COOKIE)?.value);
  if (env === 'production') notFound();
  return <QaConsole />;
}
