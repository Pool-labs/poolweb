import { NextRequest, NextResponse } from 'next/server';

import { ADMIN_ENV_COOKIE } from '@/lib/admin/adminEnv';
import { apiUrl, apiErrorMessage, resolveApiEnv } from '@/lib/admin/serverApi';

/**
 * POST /admin/api/auth/send-otp — proxy the admin email OTP request to the Pool
 * API (server→server). No cookies are set here; step 1 of the two-step login.
 *
 * Targets the GATED `/admin/auth/send-otp` endpoint (NOT the public
 * `/auth/send-otp`), so a one-time code is only ever sent to an email on the DB
 * admin allowlist. The gated endpoint self-gates and returns an identical
 * neutral `{ success: true }` whether or not the email is allowlisted (no
 * admin-email enumeration oracle) — a non-allowlisted email simply gets no code.
 * The client UX is unchanged ("if this email is authorized, a code was sent").
 *
 * ⚠️ Sent to the SELECTED environment's API (#112). Admin allowlists are
 * per-environment, so a code that works on staging is not a code that works on
 * production — the OTP is minted by, and only valid against, one of them.
 */
export async function POST(req: NextRequest) {
  let email: string | undefined;
  try {
    ({ email } = (await req.json()) as { email?: string });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
  }

  const env = resolveApiEnv(req.cookies.get(ADMIN_ENV_COOKIE)?.value);

  try {
    const res = await fetch(apiUrl(env, '/admin/auth/send-otp'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      cache: 'no-store',
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: apiErrorMessage(body, 'Failed to send code') },
        { status: res.status },
      );
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not reach the Pool API' },
      { status: 502 },
    );
  }
}
