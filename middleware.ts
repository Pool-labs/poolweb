import { NextRequest, NextResponse } from 'next/server';

import { ADMIN_ENV_COOKIE, classifyBaseUrl, isApiEnv, type ApiEnv } from '@/lib/admin/adminEnv';
import { adminCookies } from '@/lib/admin/authCookies';

/**
 * Server-side gate for the platform-admin surface.
 *
 * The httpOnly access-token cookie is the sole gate — it can only have been set
 * by the OTP + platform-admin verification in the verify-otp Route Handler, so
 * its mere presence means "server-verified admin session". No token ever lives
 * in client JS.
 *
 * Running the redirect in middleware (rather than the layout) keeps it loop-free:
 * /admin/login and the /admin/api/* handlers are excluded, so an unauthenticated
 * user is bounced to login without the layout itself trying to redirect the
 * login page. An already-authenticated user hitting /admin/login is sent on to
 * the overview.
 *
 * ⚠️ PER-ENVIRONMENT (poolmobile #112). The gate asks "is there a session for
 * the SELECTED environment", never "is there a session at all" — so switching to
 * an environment you have not logged into lands on that environment's login
 * screen. That is the intended behaviour, not a rough edge to smooth over.
 *
 * This file deliberately imports only the PURE env/cookie-name modules: it runs
 * on the edge runtime and must not pull in `serverApi`'s base-URL resolution. It
 * therefore accepts any well-formed environment name in the cookie without
 * checking that this deployment offers it — harmless, because an unoffered
 * selection has no session cookie and so fails closed to the login screen, and
 * because the cookie confers no authority in the first place.
 */

/**
 * The environment a visitor lands in before anything has been selected.
 *
 * ⚠️ This MUST agree with `serverApi.getDefaultApiEnv()`. It is derived the same
 * way — from `POOL_API_BASE_URL`, via the shared pure classifier — rather than
 * hardcoded, because a disagreement is a redirect loop, not a cosmetic bug: the
 * middleware would gate on one environment's cookie while the layout and proxy
 * used another's, so a successful login would be bounced straight back to the
 * login screen forever. `process.env.POOL_API_BASE_URL` is referenced
 * statically so Next inlines it into the edge bundle.
 */
const RAW_DEFAULT_BASE_URL = process.env.POOL_API_BASE_URL?.trim();
const FALLBACK_ENV: ApiEnv = RAW_DEFAULT_BASE_URL
  ? classifyBaseUrl(RAW_DEFAULT_BASE_URL)
  : 'staging';

function selectedEnv(req: NextRequest): ApiEnv {
  const raw = req.cookies.get(ADMIN_ENV_COOKIE)?.value;
  return isApiEnv(raw) ? raw : FALLBACK_ENV;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const env = selectedEnv(req);
  const hasSession = Boolean(req.cookies.get(adminCookies(env).accessToken)?.value);
  const isLogin = pathname === '/admin/login';

  if (!hasSession && !isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (hasSession && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/overview';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * Guard all /admin routes EXCEPT the API handlers (they do their own cookie
 * checks and must return JSON, never an HTML redirect). That exclusion covers
 * /admin/api/env, so an environment you cannot authenticate against is always
 * escapable.
 */
export const config = {
  matcher: ['/admin/((?!api/).*)'],
};
