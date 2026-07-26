/**
 * Server-only helpers for talking to the Pool API (server→server).
 *
 * The browser never sees the API base URL or any Bearer token — only Route
 * Handlers and the catch-all proxy import this. `POOL_API_BASE_URL` is a
 * server-only env var (NOT `NEXT_PUBLIC_*`), so it is never bundled into client
 * JS. (The `server-only` guard package isn't installed in this repo; these
 * helpers are imported exclusively from Route Handlers, which never ship to the
 * client.)
 */

const DEFAULT_API_BASE_URL = 'https://api-staging.poolapp.co';

/** Resolve the Pool API base URL, trimming any trailing slash. */
export function getApiBaseUrl(): string {
  const raw = process.env.POOL_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;
  return raw.replace(/\/+$/, '');
}

/** Build an absolute Pool API v1 URL from a path (with or without leading slash). */
export function apiUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}/api/v1${suffix}`;
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

export type ApiEnv = 'production' | 'staging' | 'local';

/**
 * Which Pool environment the admin dashboard is pointed at, derived from the
 * API base URL. Surfaced as a visible badge so staging insights are never
 * mistaken for production ones. Check staging FIRST — `api-staging.poolapp.co`
 * must not be classified as production.
 */
export function getApiEnv(): ApiEnv {
  const base = getApiBaseUrl();
  if (base.includes('api-staging.poolapp.co')) return 'staging';
  if (base.includes('api.poolapp.co')) return 'production';
  return 'local';
}

/** The envelope every Pool API response is wrapped in. */
export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
