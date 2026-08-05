import { NextRequest, NextResponse } from 'next/server';

import { ADMIN_ENV_COOKIE, API_ENVS } from '@/lib/admin/adminEnv';
import {
  adminCookies,
  expiredCookieOptions,
  LEGACY_ADMIN_COOKIES,
} from '@/lib/admin/authCookies';
import { apiUrl, resolveApiEnv } from '@/lib/admin/serverApi';

/**
 * POST /admin/api/auth/logout — best-effort revoke the trusted device token on
 * the API, then clear the admin session cookies regardless of the API result.
 *
 * ⚠️ SCOPED TO THE SELECTED ENVIRONMENT (#112). Signing out of staging leaves a
 * production session untouched and vice versa — sessions are separate, so
 * ending them is separate too. `?scope=all` ends every environment's session at
 * once, which is what the nav's "Sign out everywhere" offers.
 *
 * The pre-#112 UNSCOPED cookies are cleared on every logout regardless of
 * scope: they can never be adopted into an environment (see
 * `LEGACY_ADMIN_COOKIES`), so sweeping them up is pure cleanup.
 */
export async function POST(req: NextRequest) {
  const env = resolveApiEnv(req.cookies.get(ADMIN_ENV_COOKIE)?.value);
  const all = req.nextUrl.searchParams.get('scope') === 'all';
  const cookieNames = adminCookies(env);
  const deviceToken = req.cookies.get(cookieNames.deviceToken)?.value;

  if (deviceToken) {
    try {
      await fetch(apiUrl(env, '/auth/revoke-device'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceToken }),
        cache: 'no-store',
      });
    } catch {
      // Best-effort only — never block logout on a revoke failure.
    }
  }

  const response = NextResponse.json({ success: true, env, scope: all ? 'all' : env });

  const doomed = all
    ? API_ENVS.flatMap((e) => Object.values(adminCookies(e)))
    : Object.values(cookieNames);

  for (const name of [...doomed, ...LEGACY_ADMIN_COOKIES]) {
    response.cookies.set(name, '', expiredCookieOptions);
  }
  return response;
}
