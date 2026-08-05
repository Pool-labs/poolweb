/**
 * Server-only helpers for talking to the Pool API (server→server).
 *
 * The browser never sees an API base URL or any Bearer token — only Route
 * Handlers and server components import this. The `POOL_API_BASE_URL*` vars are
 * server-only (NOT `NEXT_PUBLIC_*`), so they are never bundled into client JS.
 * (The `server-only` guard package isn't installed in this repo; these helpers
 * are imported exclusively from Route Handlers and server components, which
 * never ship to the client.)
 *
 * ⚠️ MULTI-ENVIRONMENT (poolmobile #112). Every function that reaches the API
 * now takes an EXPLICIT `ApiEnv`. There is deliberately no ambient "current
 * environment" in this module and no zero-arg `apiUrl()` — the caller must
 * resolve the selection from the request's cookies (`resolveApiEnv`) and pass
 * it down. That is what makes it impossible to send one environment's token to
 * another environment's API by forgetting something.
 */

import { API_ENVS, classifyBaseUrl, isApiEnv, type ApiEnv } from './adminEnv';

export type { ApiEnv };

/**
 * Per-environment base URLs.
 *
 * Sensible defaults are built in so the production half needs NO new config at
 * go-live — the toggle works the moment prod is live. Each is still overridable
 * (a review deployment, a self-hosted API, a different local port).
 *
 * `POOL_API_BASE_URL` (the pre-#112 single-environment var) is preserved as the
 * DEFAULT SELECTION rather than as one environment's URL: a deployment that has
 * only that var set keeps behaving exactly as it did, and simply gains a second
 * environment it can switch to.
 */
const ENV_BASE_URL_DEFAULTS: Readonly<Record<ApiEnv, string>> = {
  staging: 'https://api-staging.poolapp.co',
  production: 'https://api.poolapp.co',
  local: 'http://localhost:3000',
};

/**
 * Statically referenced, one property at a time — a computed
 * `process.env[key]` is not inlined by Next and resolves to undefined in some
 * runtimes.
 */
const ENV_BASE_URL_OVERRIDES: Readonly<Record<ApiEnv, string | undefined>> = {
  staging: process.env.POOL_API_BASE_URL_STAGING,
  production: process.env.POOL_API_BASE_URL_PRODUCTION,
  local: process.env.POOL_API_BASE_URL_LOCAL,
};

function trimUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

/** Resolve ONE environment's Pool API base URL, trimming any trailing slash. */
export function getApiBaseUrl(env: ApiEnv): string {
  const override = ENV_BASE_URL_OVERRIDES[env]?.trim();
  if (override) return trimUrl(override);

  // The legacy single-env var wins for whichever environment it points at, so a
  // deployment configured before #112 keeps talking to exactly the same host.
  const legacy = process.env.POOL_API_BASE_URL?.trim();
  if (legacy && classifyBaseUrl(legacy) === env) return trimUrl(legacy);

  return ENV_BASE_URL_DEFAULTS[env];
}

/** Build an absolute Pool API v1 URL for a given environment. */
export function apiUrl(env: ApiEnv, path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl(env)}/api/v1${suffix}`;
}

/**
 * The environment a session lands in when nothing has been selected — derived
 * from `POOL_API_BASE_URL`, exactly as the pre-#112 badge was. The "simple
 * prod-flip" described in poolmobile#112 therefore still works on its own:
 * point that var at `api.poolapp.co` and the dashboard opens on production.
 */
export function getDefaultApiEnv(): ApiEnv {
  const legacy = process.env.POOL_API_BASE_URL?.trim();
  return legacy ? classifyBaseUrl(legacy) : 'staging';
}

/**
 * Which environments the switcher offers.
 *
 * `local` is hidden unless it is explicitly configured or is the default — a
 * production deployment must not display a switch to `http://localhost`.
 * Staging and production are always offered: both have working defaults, and
 * offering production before its API is live is the honest behaviour anyway
 * (selecting it prompts a login that simply cannot authenticate yet).
 */
export function getAvailableApiEnvs(): ApiEnv[] {
  const defaultEnv = getDefaultApiEnv();
  return API_ENVS.filter(
    (env) => env !== 'local' || defaultEnv === 'local' || Boolean(ENV_BASE_URL_OVERRIDES.local?.trim()),
  );
}

/**
 * Resolve the SELECTED environment from the env cookie's raw value.
 *
 * Untrusted input: anything unrecognised, or an environment this deployment
 * does not offer, falls back to the default. The cookie confers no authority
 * (see `ADMIN_ENV_COOKIE`), so this is about coherence, not security.
 */
export function resolveApiEnv(cookieValue: string | undefined): ApiEnv {
  if (isApiEnv(cookieValue) && getAvailableApiEnvs().includes(cookieValue)) return cookieValue;
  return getDefaultApiEnv();
}

/**
 * Extract a human-readable error string from a Pool API response body,
 * whatever shape it took. The API's error middleware returns
 * `{ error: { message, statusCode } }` (an OBJECT), while some paths use a
 * string `error` or a top-level `message`. Never return the object — rendering
 * it as a React child crashes the page (the "object with keys {message,
 * statusCode}" error).
 */
export function apiErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (typeof b.error === 'string') return b.error;
    if (
      b.error &&
      typeof b.error === 'object' &&
      typeof (b.error as Record<string, unknown>).message === 'string'
    ) {
      return (b.error as Record<string, unknown>).message as string;
    }
    if (typeof b.message === 'string') return b.message;
  }
  return fallback;
}

/** The envelope every Pool API response is wrapped in. */
export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
