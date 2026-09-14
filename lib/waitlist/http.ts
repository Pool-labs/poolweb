import 'server-only';

import { NextResponse, type NextRequest } from 'next/server';

import {
  FirebaseAdminUnavailableError,
  logFirebaseAdminUnavailable,
} from '@/lib/server/firebaseAdmin';
import { getLocationFromVercelHeaders } from '@/lib/server-location';
import { WAITLIST_LIMITS } from './schema';

/**
 * Plumbing shared by the public waitlist Route Handlers.
 *
 * ⚠️ No rate limiting lives here. An in-memory counter is not a limit on
 * Vercel — each function instance keeps its own, and instances come and go —
 * so pretending would be worse than saying so. Request volume is bounded at
 * the edge instead (a Vercel Firewall rate-limit rule on these paths), and
 * each request is bounded here: a capped body, point reads only.
 */

export type BodyResult = { ok: true; value: unknown } | { ok: false; response: NextResponse };

/** Read a JSON body of at most `WAITLIST_LIMITS.MAX_BODY_BYTES`. */
export async function readBoundedJson(request: NextRequest): Promise<BodyResult> {
  const max = WAITLIST_LIMITS.MAX_BODY_BYTES;
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) return { ok: false, response: tooLarge() };

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: invalidInput() };
  }
  if (Buffer.byteLength(text, 'utf8') > max) return { ok: false, response: tooLarge() };

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, response: invalidInput() };
  }
}

export function invalidInput(): NextResponse {
  return NextResponse.json(
    { error: 'Please check your details and try again.', code: 'INVALID_INPUT' },
    { status: 400 },
  );
}

function tooLarge(): NextResponse {
  return NextResponse.json({ error: 'That submission is too large.', code: 'TOO_LARGE' }, { status: 413 });
}

/** Vercel's geolocation first (it describes the real client), then the client's guess. */
export function resolveLocation(request: NextRequest, clientLocation: string | undefined): string {
  let serverLocation: string | null = null;
  try {
    serverLocation = getLocationFromVercelHeaders(request);
  } catch {
    serverLocation = null;
  }
  const location = serverLocation || clientLocation || 'Unknown';
  return location.slice(0, WAITLIST_LIMITS.MAX_LOCATION_LENGTH);
}

/**
 * Map a failure to a response without echoing it. A missing credential is a
 * 503 (the deployment is misconfigured, not the request); anything else is a
 * 500. Logs carry the route and an error code — never the request body, which
 * holds a member of the public's name and email.
 */
export function waitlistFailure(route: string, error: unknown): NextResponse {
  if (error instanceof FirebaseAdminUnavailableError) {
    logFirebaseAdminUnavailable(route, error);
    return NextResponse.json(
      { error: 'The waitlist is temporarily unavailable. Please try again later.', code: 'UNAVAILABLE' },
      { status: 503 },
    );
  }
  const code =
    error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : 'unknown';
  console.error(`[waitlist] ${route} failed`, { code });
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}
