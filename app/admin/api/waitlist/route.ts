import { NextRequest, NextResponse } from 'next/server';

import { applyRefreshedTokens, requireProductionAdminSession } from '@/lib/admin/adminSession';
import { FirebaseAdminUnavailableError, getAdminFirestore, logFirebaseAdminUnavailable } from '@/lib/server/firebaseAdmin';
import { listWaitlistEntries } from '@/lib/waitlist/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /admin/api/waitlist — every waitlist entry, for the Waitlist and Stats
 * screens.
 *
 * This static route takes precedence over the `[...path]` proxy: the waitlist
 * lives in Firestore, not the Pool API, so there is no API to authorise the
 * call for us. `requireProductionAdminSession` does it here instead, before
 * Firestore is touched — production selected, and a Bearer the production API
 * accepts as a platform admin.
 */
export async function GET(req: NextRequest) {
  const session = await requireProductionAdminSession(req);
  if (!session.ok) return session.response;

  try {
    const entries = await listWaitlistEntries(getAdminFirestore());
    const response = NextResponse.json(
      { success: true, data: entries },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    if (session.refreshed) applyRefreshedTokens(response, session.env, session.refreshed);
    return response;
  } catch (error) {
    if (error instanceof FirebaseAdminUnavailableError) {
      logFirebaseAdminUnavailable('admin list', error);
      return NextResponse.json(
        { success: false, error: 'The waitlist is not configured on this deployment.' },
        { status: 503 },
      );
    }
    console.error('[waitlist] admin list failed');
    return NextResponse.json({ success: false, error: 'Could not load the waitlist.' }, { status: 500 });
  }
}
