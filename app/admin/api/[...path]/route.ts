import { NextRequest, NextResponse } from 'next/server';

import { ADMIN_COOKIE, adminCookieBaseOptions } from '@/lib/admin/authCookies';
import { apiUrl, ApiEnvelope } from '@/lib/admin/serverApi';

/**
 * Same-origin catch-all proxy for the identity-gated Pool admin API.
 *
 * The browser calls `/admin/api/<adminPath>` (same-origin, no token in JS). This
 * handler reads the httpOnly access-token cookie server-side, forwards the
 * request to `${API}/api/v1/admin/<adminPath>` with a Bearer header, and streams
 * the enveloped `{ success, data }` back.
 *
 * On a 401 from the API it transparently refreshes ONCE using the refresh-token
 * cookie, rewrites the session cookies, and retries. If refresh fails it returns
 * 401 so the client can bounce to /admin/login.
 *
 * The specific /admin/api/auth/* handlers take precedence over this catch-all,
 * so login/logout never route through here.
 */

type RouteContext = { params: Promise<{ path: string[] }> };

const FORWARDABLE_HEADERS = new Set(['content-type', 'accept']);

async function forward(
  req: NextRequest,
  targetPath: string,
  accessToken: string,
): Promise<Response> {
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (FORWARDABLE_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });
  headers.set('Authorization', `Bearer ${accessToken}`);

  const method = req.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? await req.text() : undefined;

  return fetch(`${apiUrl(`/admin/${targetPath}`)}${req.nextUrl.search}`, {
    method,
    headers,
    body: body && body.length > 0 ? body : undefined,
    cache: 'no-store',
  });
}

/** Attempt a single token refresh. Returns the new pair, or null on failure. */
async function tryRefresh(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const res = await fetch(apiUrl('/auth/refresh-token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = (await res.json().catch(() => ({}))) as ApiEnvelope<{
      accessToken: string;
      refreshToken: string;
    }>;
    if (!body?.data?.accessToken) return null;
    return {
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken || refreshToken,
    };
  } catch {
    return null;
  }
}

async function handle(req: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  const targetPath = (path ?? []).join('/');

  const accessToken = req.cookies.get(ADMIN_COOKIE.accessToken)?.value;
  if (!accessToken) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  let apiRes = await forward(req, targetPath, accessToken);

  // Transparent single refresh + retry on 401.
  if (apiRes.status === 401) {
    const refreshToken = req.cookies.get(ADMIN_COOKIE.refreshToken)?.value;
    const refreshed = refreshToken ? await tryRefresh(refreshToken) : null;
    if (!refreshed) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 },
      );
    }
    apiRes = await forward(req, targetPath, refreshed.accessToken);

    const payload = await apiRes.text();
    const response = new NextResponse(payload, {
      status: apiRes.status,
      headers: { 'Content-Type': apiRes.headers.get('content-type') || 'application/json' },
    });
    response.cookies.set(ADMIN_COOKIE.accessToken, refreshed.accessToken, adminCookieBaseOptions);
    response.cookies.set(ADMIN_COOKIE.refreshToken, refreshed.refreshToken, adminCookieBaseOptions);
    return response;
  }

  const payload = await apiRes.text();
  return new NextResponse(payload, {
    status: apiRes.status,
    headers: { 'Content-Type': apiRes.headers.get('content-type') || 'application/json' },
  });
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
