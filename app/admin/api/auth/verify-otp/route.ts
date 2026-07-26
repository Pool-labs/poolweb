import { NextRequest, NextResponse } from 'next/server';

import { ADMIN_COOKIE, adminCookieBaseOptions } from '@/lib/admin/authCookies';
import { apiUrl, apiErrorMessage, ApiEnvelope } from '@/lib/admin/serverApi';
import type { VerifyOtpResult } from '@/lib/admin/types';

/**
 * POST /admin/api/auth/verify-otp — step 2 of login.
 *
 * 1. Verify the email OTP with the Pool API → { accessToken, refreshToken, ... }.
 * 2. IMMEDIATELY confirm platform-admin status by calling a cheap identity-gated
 *    admin endpoint with the fresh Bearer. A valid non-admin JWT gets 403 there
 *    (`requirePlatformAdmin`) — so a 403 means "authenticated, but not an admin"
 *    and login is rejected WITHOUT setting any cookie.
 * 3. Only on 200 do we set the httpOnly session cookies (path=/admin).
 */
export async function POST(req: NextRequest) {
  let email: string | undefined;
  let code: string | undefined;
  try {
    ({ email, code } = (await req.json()) as { email?: string; code?: string });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  if (!email || !code) {
    return NextResponse.json(
      { success: false, error: 'Email and code are required' },
      { status: 400 },
    );
  }

  // 1. Verify OTP.
  let tokens: VerifyOtpResult;
  try {
    const res = await fetch(apiUrl('/auth/verify-otp'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => ({}))) as ApiEnvelope<VerifyOtpResult>;
    if (!res.ok || !body?.data?.accessToken) {
      return NextResponse.json(
        { success: false, error: apiErrorMessage(body, 'Invalid or expired code') },
        { status: res.status === 200 ? 401 : res.status },
      );
    }
    tokens = body.data;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not reach the Pool API' },
      { status: 502 },
    );
  }

  // 2. Platform-admin gate: a cheap identity-gated call. 403 → not an admin.
  try {
    const gateRes = await fetch(apiUrl('/admin/metrics/signups?days=1'), {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
      cache: 'no-store',
    });
    if (gateRes.status === 403) {
      return NextResponse.json(
        { success: false, error: 'This account is not a platform admin.' },
        { status: 403 },
      );
    }
    if (!gateRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Could not verify admin access. Try again.' },
        { status: 502 },
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not verify admin access. Try again.' },
      { status: 502 },
    );
  }

  // 3. Success — set httpOnly session cookies. Tokens never touch client JS.
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE.accessToken, tokens.accessToken, adminCookieBaseOptions);
  response.cookies.set(ADMIN_COOKIE.refreshToken, tokens.refreshToken, adminCookieBaseOptions);
  response.cookies.set(ADMIN_COOKIE.deviceToken, tokens.deviceToken, adminCookieBaseOptions);
  return response;
}
