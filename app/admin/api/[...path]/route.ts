import { NextRequest, NextResponse } from 'next/server';

import { ADMIN_ENV_COOKIE, type ApiEnv } from '@/lib/admin/adminEnv';
import { adminCookies, adminCookieBaseOptions } from '@/lib/admin/authCookies';
import { apiUrl, resolveApiEnv, ApiEnvelope } from '@/lib/admin/serverApi';

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
 * The specific /admin/api/auth/* and /admin/api/env handlers take precedence
 * over this catch-all, so login/logout/env-switching never route through here.
 *
 * ⚠️ ENVIRONMENT ROUTING (poolmobile #112). The environment is resolved ONCE per
 * request, from the env cookie, and then used for BOTH halves of the call: the
 * base URL AND which token cookie is read. They are never resolved separately —
 * there is only one `env` in scope — which is what makes "staging token sent to
 * production" not a mistake you can make here. A refresh writes back to the SAME
 * environment's cookies for the same reason.
 */

type RouteContext = { params: Promise<{ path: string[] }> };

const FORWARDABLE_HEADERS = new Set(['content-type', 'accept']);

async function forward(
  req: NextRequest,
  env: ApiEnv,
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

  return fetch(`${apiUrl(env, `/admin/${targetPath}`)}${req.nextUrl.search}`, {
    method,
    headers,
    body: body && body.length > 0 ? body : undefined,
    cache: 'no-store',
  });
}

/**
 * Attempt a single token refresh AGAINST THE SAME ENVIRONMENT. Returns the new
 * pair, or null on failure.
 */
async function tryRefresh(
  env: ApiEnv,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const res = await fetch(apiUrl(env, '/auth/refresh-token'), {
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

  const env = resolveApiEnv(req.cookies.get(ADMIN_ENV_COOKIE)?.value);
  const cookieNames = adminCookies(env);

  const accessToken = req.cookies.get(cookieNames.accessToken)?.value;
  if (!accessToken) {
    // Not authenticated FOR THIS ENVIRONMENT. A session in the other one is
    // irrelevant and is deliberately not consulted.
    return NextResponse.json(
      { success: false, error: `Not authenticated for ${env}` },
      { status: 401 },
    );
  }

  let apiRes = await forward(req, env, targetPath, accessToken);

  // Transparent single refresh + retry on 401.
  if (apiRes.status === 401) {
    const refreshToken = req.cookies.get(cookieNames.refreshToken)?.value;
    const refreshed = refreshToken ? await tryRefresh(env, refreshToken) : null;
    if (!refreshed) {
      return NextResponse.json(
        { success: false, error: `Session expired for ${env}` },
        { status: 401 },
      );
    }
    apiRes = await forward(req, env, targetPath, refreshed.accessToken);

    const payload = await apiRes.text();
    const response = new NextResponse(payload, {
      status: apiRes.status,
      headers: { 'Content-Type': apiRes.headers.get('content-type') || 'application/json' },
    });
    response.cookies.set(cookieNames.accessToken, refreshed.accessToken, adminCookieBaseOptions);
    response.cookies.set(cookieNames.refreshToken, refreshed.refreshToken, adminCookieBaseOptions);
    return response;
  }

  const payload = await apiRes.text();
  return new NextResponse(payload, {
    status: apiRes.status,
    headers: { 'Content-Type': apiRes.headers.get('content-type') || 'application/json' },
  });
}

/**
 * Every method a Route Handler can be asked for, exported deliberately as a
 * COMPLETE set rather than a curated one.
 *
 * ⚠️ A Next Route Handler answers 405 for any method it does not export, and it
 * does so BEFORE the request reaches `handle` — so an un-exported method is not
 * a proxy that forwards badly, it is a proxy that is not there. That is exactly
 * how `PUT` came to be missing (poolmobile #589): `PUT /admin/app/requirements`
 * is the only PUT on the whole admin surface, and it is #313, the control that
 * blocks every install of the app at launch. The dashboard could neither arm it
 * nor — far worse — CLEAR it, because clearing is the same endpoint with
 * `minimumVersion: null`.
 *
 * `handle` is method-agnostic: it forwards `req.method` and, for anything that
 * is not GET/HEAD, the body. So there is nothing to decide per method, and a
 * curated list only creates a way to be wrong. Exporting all of them means the
 * admin API can add a method tomorrow and this proxy already carries it.
 * (HEAD is served from GET by Next; OPTIONS is never needed same-origin.)
 */
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
