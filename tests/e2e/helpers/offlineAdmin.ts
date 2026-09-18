import type { BrowserContext, Page, Route } from '@playwright/test';

import { envelope, STATS_ROUTES } from '../fixtures/statsPayloads';

/**
 * Drive an admin page with NO staging session and NO network (poolweb #33).
 *
 * ⚠️ WHAT THIS IS NOT. It is not a way around the login, and it weakens
 * nothing: the cookie planted below is an opaque string that only satisfies
 * `middleware.ts`'s PRESENCE check — the same check CLAUDE.md describes as
 * conferring no authority, because every real call still has to be accepted by
 * the Pool API. Here no real call is made at all: every `/admin/api/**` request
 * is fulfilled from a fixture, and anything a test forgets to stub is FAILED
 * rather than forwarded, so this file can never reach an environment by
 * accident. The API-backed specs next door (which DO log in, for real, against
 * staging only) remain the proof that the proxy and the session work.
 *
 * What it buys: the two classes of state a healthy environment cannot produce —
 * a known number (so the delta arithmetic is checkable) and a failed or
 * pre-#624 payload (so the "why is this empty" rules are exercised).
 */

/** The session-cookie name for the staging environment (`adminCookies('staging')`). */
const STAGING_ACCESS_COOKIE = 'pool_admin_at__staging';

/** Plant the presence-only cookie the middleware gate looks for. */
export async function plantOfflineSession(context: BrowserContext): Promise<void> {
  await context.addCookies([
    {
      name: STAGING_ACCESS_COOKIE,
      // Deliberately not a JWT shape: nothing may ever be tempted to send it.
      value: 'offline-fixture-session',
      domain: 'localhost',
      path: '/admin',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

export interface OfflineOptions {
  /** Per-path overrides, by the suffix after `/admin/api/` (no query string). */
  overrides?: Record<string, unknown>;
  /** Paths whose call should FAIL, to exercise a panel's degraded state. */
  fail?: string[];
}

/**
 * Serve every `/admin/api/**` call from fixtures.
 *
 * An un-stubbed path aborts the request — a loud failure in the test rather
 * than a quiet one that leaves the page half-real.
 */
export async function serveAdminFixtures(
  page: Page,
  { overrides = {}, fail = [] }: OfflineOptions = {},
): Promise<void> {
  // ⚠️ THE MAP TILES ARE NOT PART OF THE API AND WOULD OTHERWISE GO OUT TO THE
  // REAL CDN. `NEXT_PUBLIC_MAP_TILES_BASE_URL` has a committed default, so the
  // Geography map really does try to fetch the basemap archive and its glyphs
  // from CloudFront — from an "offline" spec, over the network, on every run.
  // These specs are offline by construction and must stay that way, so the
  // basemap is refused here and the map's own failure path is what renders.
  // That path is a first-class state worth exercising anyway: a browser with no
  // WebGL reaches it too.
  await page.route('**/*.pmtiles*', (route: Route) => route.abort('failed'));
  await page.route('**/fonts/**', (route: Route) => route.abort('failed'));

  await page.route('**/admin/api/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/admin\/api\//, '');

    if (fail.includes(path)) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Fixture: this source is down' }),
      });
      return;
    }

    const payload = path in overrides ? overrides[path] : STATS_ROUTES[path];
    if (payload === undefined) {
      await route.abort('failed');
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(envelope(payload)),
    });
  });
}
