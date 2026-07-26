import { NextRequest, NextResponse } from 'next/server';

import { ADMIN_COOKIE, ADMIN_COOKIE_PATH } from '@/lib/admin/authCookies';
import { apiUrl } from '@/lib/admin/serverApi';

/**
 * POST /admin/api/auth/logout — best-effort revoke the trusted device token on
 * the API, then clear all admin session cookies regardless of the API result.
 */
export async function POST(req: NextRequest) {
  const deviceToken = req.cookies.get(ADMIN_COOKIE.deviceToken)?.value;

  if (deviceToken) {
    try {
      await fetch(apiUrl('/auth/revoke-device'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceToken }),
        cache: 'no-store',
      });
    } catch {
      // Best-effort only — never block logout on a revoke failure.
    }
  }

  const response = NextResponse.json({ success: true });
  for (const name of Object.values(ADMIN_COOKIE)) {
    response.cookies.set(name, '', { path: ADMIN_COOKIE_PATH, maxAge: 0 });
  }
  return response;
}
