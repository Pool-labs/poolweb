/**
 * Platform-admin session cookie contract (server-only usage).
 *
 * Tokens NEVER reach client JS: these are httpOnly cookies set by the Next
 * Route Handlers and read only server-side (Route Handlers, middleware, the
 * server layout). Scoped to `path=/admin` so they ride every same-origin
 * browser→Next request under /admin (screens + the /admin/api proxy) and
 * nothing else.
 */

export const ADMIN_COOKIE = {
  /** Access token (short-lived) — Bearer for API calls made by the proxy. */
  accessToken: 'pool_admin_at',
  /** Refresh token — used server-side to mint a new pair on a 401. */
  refreshToken: 'pool_admin_rt',
  /** Trusted device token — best-effort revoked on logout. */
  deviceToken: 'pool_admin_dt',
} as const;

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
 */
export const adminCookieBaseOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: ADMIN_COOKIE_PATH,
  maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
} as const;
