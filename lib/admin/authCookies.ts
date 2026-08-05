/**
 * Platform-admin session cookie contract (server-only usage).
 *
 * Tokens NEVER reach client JS: these are httpOnly cookies set by the Next
 * Route Handlers and read only server-side (Route Handlers, middleware, the
 * server layout). Scoped to `path=/admin` so they ride every same-origin
 * browser→Next request under /admin (screens + the /admin/api proxy) and
 * nothing else.
 *
 * ⚠️ PER-ENVIRONMENT (poolmobile #112). A Pool JWT is only valid for the
 * environment that issued it, so every session cookie is namespaced by
 * environment — `pool_admin_at__staging`, `pool_admin_at__production`. You are
 * logged into each environment SEPARATELY, and there is no code path that reads
 * one environment's token and sends it to another. Nothing in this file exposes
 * an unscoped session-cookie name any more; `adminCookies(env)` is the only way
 * to get one, so a caller cannot forget to scope it.
 */

import { envScopedCookie, type ApiEnv } from './adminEnv';

/** Cookie-name stems. Never used directly — always via `adminCookies(env)`. */
const COOKIE_STEM = {
  /** Access token (short-lived) — Bearer for API calls made by the proxy. */
  accessToken: 'pool_admin_at',
  /** Refresh token — used server-side to mint a new pair on a 401. */
  refreshToken: 'pool_admin_rt',
  /** Trusted device token — best-effort revoked on logout. */
  deviceToken: 'pool_admin_dt',
} as const;

export interface AdminCookieNames {
  accessToken: string;
  refreshToken: string;
  deviceToken: string;
}

/** The three session-cookie names for ONE environment. */
export function adminCookies(env: ApiEnv): AdminCookieNames {
  return {
    accessToken: envScopedCookie(COOKIE_STEM.accessToken, env),
    refreshToken: envScopedCookie(COOKIE_STEM.refreshToken, env),
    deviceToken: envScopedCookie(COOKIE_STEM.deviceToken, env),
  };
}

/**
 * The pre-#112 UNSCOPED cookie names.
 *
 * There is deliberately NO migration that adopts one of these into an
 * environment: a legacy cookie carries no record of which API issued it, and
 * the deploy that ships #112 may also be the one that repoints
 * `POOL_API_BASE_URL`, so "guessing" would risk presenting a staging session as
 * a production one — the exact confusion this feature exists to prevent.
 * Everyone re-logs in once. These are listed only so logout can sweep them up.
 */
export const LEGACY_ADMIN_COOKIES: readonly string[] = Object.values(COOKIE_STEM);

/** All admin cookies are confined to the /admin path. */
export const ADMIN_COOKIE_PATH = '/admin';

/**
 * Persist the admin session for 30 days — the refresh-token lifetime — so an
 * admin isn't re-prompted for an OTP every browser session. Without a maxAge
 * these are SESSION cookies that die on browser close, forcing a fresh login.
 * The proxy transparently refreshes the 7-day access token as needed; when the
 * 30-day refresh token finally expires, the next request 401s → re-login.
 * Sign-out and DB-level revocation (removing the email from the allowlist,
 * checked per request) both still take effect immediately regardless.
 */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/**
 * Base attributes for every admin cookie. `secure` is on in production only so
 * cookies still work over http://localhost during dev. `maxAge` makes the
 * session persistent (see above) instead of browser-session-scoped.
 *
 * ⚠️ `process.env.NODE_ENV` here is the BUILD MODE of this Next app — it has
 * nothing to do with which Pool environment is being VIEWED. The selected
 * `ApiEnv` must never be used to decide `secure`.
 */
export const adminCookieBaseOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: ADMIN_COOKIE_PATH,
  maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
} as const;

/**
 * Options for the selected-environment cookie. Same lifetime and path as a
 * session, and httpOnly like the rest: nothing client-side needs to read it
 * (the server layout hands the resolved environment to the nav as a prop), so
 * every piece of admin state stays out of client JS by default rather than by
 * accident. It holds no secret either way — see `ADMIN_ENV_COOKIE`.
 */
export const adminEnvCookieOptions = adminCookieBaseOptions;

/** Expire a cookie by name. */
export const expiredCookieOptions = { path: ADMIN_COOKIE_PATH, maxAge: 0 } as const;
