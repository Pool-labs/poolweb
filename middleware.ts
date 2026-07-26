import { NextRequest, NextResponse } from 'next/server';

import { ADMIN_COOKIE } from '@/lib/admin/authCookies';

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
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(ADMIN_COOKIE.accessToken)?.value);
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
 * checks and must return JSON, never an HTML redirect).
 */
export const config = {
  matcher: ['/admin/((?!api/).*)'],
};
