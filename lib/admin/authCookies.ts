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
 * Base attributes for every admin cookie. `secure` is on in production only so
 * cookies still work over http://localhost during dev.
 */
export const adminCookieBaseOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: ADMIN_COOKIE_PATH,
} as const;
