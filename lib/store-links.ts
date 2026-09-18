/**
 * Where Pool actually is, in the app stores.
 *
 * ⚠️ ONE DEFINITION, BECAUSE THE FAILURE MODE IS A DEAD LINK NOBODY NOTICES.
 * The download page, the FAQ and any future banner all answer the same
 * question, and a URL pasted into three files drifts the first time a listing
 * moves. Everything reads this.
 *
 * ⚠️ THE ASYMMETRY IS THE POINT, AND IT IS TEMPORARY. iOS is LIVE; Android is
 * not listed yet. Two equal-looking store buttons would send every Android
 * visitor to a dead end, which is worse than telling them plainly that it is
 * coming — so `PLAY_STORE_URL` is `null` and every surface branches on it
 * rather than rendering a hopeful placeholder.
 *
 * **When Google Play goes live, set `PLAY_STORE_URL` here and nothing else
 * needs editing** — the copy on every surface is already written for both
 * states, and `tests/e2e/marketing/download.spec.ts` covers both.
 */

/** Pool on the App Store — live since 2026-09-18. */
export const APP_STORE_URL =
  'https://apps.apple.com/us/app/pool-social-spending/id6762954792';

/**
 * Pool on Google Play, or `null` while the listing does not exist.
 *
 * ⚠️ Do NOT put a guessed `?id=` URL here ahead of the listing. A Play link
 * that 404s looks identical to a broken site, and the honest "coming soon"
 * state is already built.
 */
export const PLAY_STORE_URL: string | null = null;

/** True when a visitor can actually install on this platform today. */
export const isIosLive = (): boolean => APP_STORE_URL.length > 0;
export const isAndroidLive = (): boolean => PLAY_STORE_URL !== null;
