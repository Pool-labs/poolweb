import { NextRequest, NextResponse } from 'next/server';

import { apiUrl } from '@/lib/admin/serverApi';

/**
 * POST /admin/api/auth/send-otp — proxy the email OTP request to the Pool API
 * (server→server). No cookies are set here; step 1 of the two-step login.
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

  try {
    const res = await fetch(apiUrl('/auth/send-otp'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      cache: 'no-store',
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: body?.error || body?.message || 'Failed to send code' },
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
