import { NextRequest, NextResponse } from 'next/server';

import { ADMIN_ENV_COOKIE, isApiEnv } from '@/lib/admin/adminEnv';
import { adminCookies, adminEnvCookieOptions } from '@/lib/admin/authCookies';
import { getAvailableApiEnvs, resolveApiEnv } from '@/lib/admin/serverApi';

/**
 * POST /admin/api/env — switch the dashboard between Pool environments
 * (poolmobile #112).
 *
 * This handler does exactly ONE thing: write the selected-environment cookie.
 * It mints nothing, revokes nothing, and touches no session cookie in either
 * direction — which is the point. Sessions are per-environment and already
 * exist (or don't); switching is purely a change of which pair of
 * `(base URL, token cookie)` the proxy will use next. Nothing about being
 * signed into one environment travels to the other.
 *
 * It sits ALONGSIDE the catch-all proxy rather than inside it, so the switch
 * itself never needs a session — you must be able to leave an environment you
 * cannot authenticate against.
 *
 * The response reports whether a session already exists for the target, so the
 * client can send the founder to the dashboard or straight to that
 * environment's login rather than bouncing through a redirect.
 */
/**
 * GET /admin/api/env — the current selection, the offered environments, and
 * which of them already have a session.
 *
 * Exists for the LOGIN screen, which renders outside the admin shell and so has
 * no server-resolved `env` prop to read. Knowing which environment you are
 * about to hand an OTP to is not optional — admin allowlists are
 * per-environment, and "the code didn't work" is otherwise indistinguishable
 * from "you are typing it into the wrong environment".
 *
 * Returns booleans about the caller's own cookies, never a token, and requires
 * no session — you must be able to see and change the environment BEFORE you
 * can authenticate to any of them.
 */
export async function GET(req: NextRequest) {
  const env = resolveApiEnv(req.cookies.get(ADMIN_ENV_COOKIE)?.value);
  const availableEnvs = getAvailableApiEnvs();
  return NextResponse.json({
    success: true,
    data: {
      env,
      availableEnvs,
      authenticatedEnvs: availableEnvs.filter((candidate) =>
        Boolean(req.cookies.get(adminCookies(candidate).accessToken)?.value),
      ),
    },
  });
}

export async function POST(req: NextRequest) {
  let requested: unknown;
  try {
    ({ env: requested } = (await req.json()) as { env?: unknown });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  // Reject rather than silently coerce: a switch that quietly lands somewhere
  // other than where it was asked to is the one failure mode this whole feature
  // is about. (`resolveApiEnv` coerces on READ, where a stale cookie must not
  // break the page — but a WRITE is an explicit intent.)
  if (!isApiEnv(requested) || !getAvailableApiEnvs().includes(requested)) {
    return NextResponse.json(
      { success: false, error: 'Unknown or unconfigured environment' },
      { status: 400 },
    );
  }

  const previous = resolveApiEnv(req.cookies.get(ADMIN_ENV_COOKIE)?.value);
  const authenticated = Boolean(req.cookies.get(adminCookies(requested).accessToken)?.value);

  const response = NextResponse.json({
    success: true,
    env: requested,
    previousEnv: previous,
    /** False → the client should route to /admin/login for this environment. */
    authenticated,
  });
  response.cookies.set(ADMIN_ENV_COOKIE, requested, adminEnvCookieOptions);
  return response;
}
