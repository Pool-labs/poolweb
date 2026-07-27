import { notFound } from 'next/navigation';

import { getApiEnv } from '@/lib/admin/serverApi';
import { QaConsole } from '@/components/admin/qa/QaConsole';

/**
 * Staging-only QA console (poolmobile #132).
 *
 * TWO gates, both required:
 *  1. Here (server-side, first pass): if this deployment points at the
 *     PRODUCTION Pool API the route 404s outright — the page is never rendered
 *     and no QA request is ever issued.
 *  2. In `QaConsole` (authoritative): `GET /qa/status` 404s whenever the API
 *     has the console disabled (killswitch + environment assertion), which the
 *     client treats as "disabled" and bounces away from.
 *
 * The nav entry is a convenience only — it is NOT a security boundary; typing
 * the URL directly hits both gates above.
 */
export default function AdminQaPage() {
  if (getApiEnv() === 'production') notFound();
  return <QaConsole />;
}
