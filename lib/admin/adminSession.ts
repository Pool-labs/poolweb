import 'server-only';

import { NextResponse, type NextRequest } from 'next/server';

import { ADMIN_ENV_COOKIE, type ApiEnv } from './adminEnv';
import { adminCookieBaseOptions, adminCookies } from './authCookies';
import { apiUrl, resolveApiEnv, type ApiEnvelope } from './serverApi';

/**
 * Server-side proof of a Pool platform-admin session, for Route Handlers that
 * touch data the Pool API does not guard for us (the Firestore waitlist).
 *
 * Every other admin surface is safe behind the catch-all proxy because the Pool
 * API authorises each call. The waitlist is not in the Pool API, so a cookie
 * merely being PRESENT (all `middleware.ts` checks) proves nothing — a forged
 * cookie would satisfy it. This gate proves the session the same way login
 * does (`verify-otp`): it calls an identity-gated admin endpoint with the
 * cookie's Bearer and acts only on a 200, which the API returns only to a live
 * platform admin of THAT environment.
 */

export type RefreshedTokens = { accessToken: string; refreshToken: string };

/** The cheap identity-gated call login already uses as its platform-admin check. */
const ADMIN_PROBE_PATH = '/admin/metrics/signups?days=1';

/**
 * Attempt a single token refresh AGAINST THE SAME ENVIRONMENT. Returns the new
 * pair, or null on failure. Shared with the catch-all proxy.
 */
export async function refreshAdminTokens(env: ApiEnv, refreshToken: string): Promise<RefreshedTokens | null> {
  try {
    const res = await fetch(apiUrl(env, '/auth/refresh-token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = (await res.json().catch(() => ({}))) as ApiEnvelope<RefreshedTokens>;
    if (!body?.data?.accessToken) return null;
    return {
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken || refreshToken,
    };
  } catch {
    return null;
  }
}

/** Write a refreshed pair back into the SAME environment's cookies. */
export function applyRefreshedTokens(response: NextResponse, env: ApiEnv, tokens: RefreshedTokens): void {
  const names = adminCookies(env);
  response.cookies.set(names.accessToken, tokens.accessToken, adminCookieBaseOptions);
  response.cookies.set(names.refreshToken, tokens.refreshToken, adminCookieBaseOptions);
}

export type AdminSession = {
  ok: true;
  env: ApiEnv;
  /** Pool user id of the admin (the token's `sub`), for attribution. */
  actorId: string | null;
  /** Set when the access token had to be refreshed; write it back on the response. */
  refreshed: RefreshedTokens | null;
};

export type AdminSessionResult = AdminSession | { ok: false; response: NextResponse };

function refuse(status: number, error: string): { ok: false; response: NextResponse } {
  return {
    ok: false,
    response: NextResponse.json({ success: false, error }, { status, headers: { 'Cache-Control': 'no-store' } }),
  };
}

/**
 * Read `sub` from a JWT the API has just accepted. The API verified the
 * signature; this only extracts the claim for attribution.
 */
function tokenSubject(token: string): string | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: unknown };
    return typeof claims.sub === 'string' ? claims.sub.slice(0, 128) : null;
  } catch {
    return null;
  }
}

async function probe(env: ApiEnv, accessToken: string): Promise<number> {
  const res = await fetch(apiUrl(env, ADMIN_PROBE_PATH), {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  return res.status;
}

/**
 * Require a live platform-admin session for the PRODUCTION environment.
 *
 * The waitlist is one Firestore project for every environment — the live
 * marketing signups — so it is served only when production is selected
 * (poolmobile #602), and only to a session the production API accepts:
 *
 *  - another environment selected → 404 (the surface does not exist there)
 *  - no production session cookie  → 401
 *  - the API refuses the Bearer    → one refresh, then 401 / 403
 *  - the API is unreachable        → 502 (fail closed)
 */
export async function requireProductionAdminSession(req: NextRequest): Promise<AdminSessionResult> {
  const env = resolveApiEnv(req.cookies.get(ADMIN_ENV_COOKIE)?.value);
  if (env !== 'production') return refuse(404, 'Not found');

  const names = adminCookies(env);
  const accessToken = req.cookies.get(names.accessToken)?.value;
  if (!accessToken) return refuse(401, `Not authenticated for ${env}`);

  try {
    let token = accessToken;
    let refreshed: RefreshedTokens | null = null;
    let status = await probe(env, token);

    if (status === 401) {
      const refreshToken = req.cookies.get(names.refreshToken)?.value;
      refreshed = refreshToken ? await refreshAdminTokens(env, refreshToken) : null;
      if (!refreshed) return refuse(401, `Session expired for ${env}`);
      token = refreshed.accessToken;
      status = await probe(env, token);
    }

    if (status === 200) return { ok: true, env, actorId: tokenSubject(token), refreshed };
    if (status === 401) return refuse(401, `Session expired for ${env}`);
    if (status === 403) return refuse(403, `This account is not a platform admin on ${env}.`);
    return refuse(502, 'Could not verify admin access. Try again.');
  } catch {
    return refuse(502, 'Could not verify admin access. Try again.');
  }
}

/**
 * Refuse a request a browser marks as cross-site. The session cookies are
 * `SameSite=Lax`, so a cross-site DELETE already arrives without them; this is
 * a second, explicit line for the one destructive waitlist call. Browsers
 * always send `Sec-Fetch-Site`; a client that does not send it holds no admin
 * cookies to abuse.
 */
export function isCrossSiteRequest(req: NextRequest): boolean {
  const site = req.headers.get('sec-fetch-site');
  return site !== null && site !== 'same-origin';
}
