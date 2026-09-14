import { NextRequest, NextResponse } from 'next/server';

import {
  applyRefreshedTokens,
  isCrossSiteRequest,
  requireProductionAdminSession,
} from '@/lib/admin/adminSession';
import { FirebaseAdminUnavailableError, getAdminFirestore, logFirebaseAdminUnavailable } from '@/lib/server/firebaseAdmin';
import { waitlistEntryIdSchema } from '@/lib/waitlist/schema';
import { deleteWaitlistEntry } from '@/lib/waitlist/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * DELETE /admin/api/waitlist/:id — permanently remove one signup.
 *
 * Same gate as the list (production + a Bearer the production API accepts as
 * a platform admin), plus a refusal of browser-flagged cross-site requests.
 * The delete and an append-only `waitlist_deletions` record (entry id, time,
 * admin's Pool user id) commit in one Firestore transaction.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  if (isCrossSiteRequest(req)) {
    return NextResponse.json({ success: false, error: 'Cross-site request refused' }, { status: 403 });
  }

  const session = await requireProductionAdminSession(req);
  if (!session.ok) return session.response;

  const { id } = await context.params;
  const parsedId = waitlistEntryIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ success: false, error: 'Invalid entry id' }, { status: 400 });
  }

  try {
    const deleted = await deleteWaitlistEntry(getAdminFirestore(), parsedId.data, session.actorId, new Date());
    const response = deleted
      ? NextResponse.json({ success: true, data: { id: parsedId.data } })
      : NextResponse.json({ success: false, error: 'That entry no longer exists.' }, { status: 404 });
    if (deleted) {
      console.info('[waitlist] entry deleted', { entryId: parsedId.data, deletedBy: session.actorId });
    }
    if (session.refreshed) applyRefreshedTokens(response, session.env, session.refreshed);
    return response;
  } catch (error) {
    if (error instanceof FirebaseAdminUnavailableError) {
      logFirebaseAdminUnavailable('admin delete', error);
      return NextResponse.json(
        { success: false, error: 'The waitlist is not configured on this deployment.' },
        { status: 503 },
      );
    }
    console.error('[waitlist] admin delete failed');
    return NextResponse.json({ success: false, error: 'Could not delete that entry.' }, { status: 500 });
  }
}
