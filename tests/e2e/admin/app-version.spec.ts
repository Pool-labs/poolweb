import { expect, test } from '@playwright/test';

import { skipWithoutAdminSession } from '../helpers/session';

skipWithoutAdminSession();

/**
 * The #313 force-update gate's page (poolmobile #590) + the #589 regression.
 *
 * ⚠️ NOTHING HERE MAY ARM THE GATE. `GET /admin/app/requirements` currently
 * answers `minimumVersion: null` for both platforms on staging and MUST stay
 * that way — arming it would block real staging installs at launch. So:
 *  - the render test clicks nothing (`Require` and `Clear` are never pressed);
 *  - the #589 regression sends a PUT the API is GUARANTEED to refuse (an
 *    unrankable version string fails the server's Zod + CHECK constraint), and
 *    then proves the refused PUT wrote nothing.
 */
test.describe('App version', () => {
  test('renders both platform cards with their gate state', async ({ page }) => {
    await page.goto('/admin/app-version');

    await expect(page.getByRole('heading', { name: 'App version' })).toBeVisible();
    await expect(page.getByText('Failed to load version requirements')).toHaveCount(0);

    // Both platform cards, each with a real state badge. "No minimum set" is a
    // STATE the API answered, not an empty screen — the page has no empty
    // state because the API always returns both platforms.
    await expect(page.getByRole('heading', { name: 'iOS', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Android', exact: true })).toBeVisible();
    await expect(page.getByText(/^(No minimum set|Requires .+)$/)).toHaveCount(2);
    await expect(page.getByLabel('Minimum iOS version')).toBeVisible();
    await expect(page.getByLabel('Minimum Android version')).toBeVisible();
  });

  test('#589 regression: a PUT issued through the dashboard proxy reaches the API', async ({
    page,
  }) => {
    // Make sure the session cookies are live in this context.
    await page.goto('/admin/app-version');
    await expect(page.getByRole('heading', { name: 'App version' })).toBeVisible();

    const before = await page.request.get('/admin/api/app/requirements');
    expect(before.status()).toBe(200);
    const beforeBody: unknown = await before.json();

    // The page's own client validates the version BEFORE sending, so an
    // unrankable string can only be PUT the way this does it: the same
    // same-origin proxy path, the same browser cookies, via the context's
    // request API. The API's Zod refuses `-staging` suffixes outright.
    const res = await page.request.put('/admin/api/app/requirements', {
      data: { platform: 'ios', minimumVersion: '1.2.0-staging' },
    });

    // #589's bug shape: Next answered 405 itself because the catch-all proxy
    // did not export PUT — the request never reached the API at all.
    expect(res.status(), 'a 405 means the Next proxy dropped PUT again (#589)').not.toBe(405);

    // A 400 is the staging API's own validation refusing the version — proof
    // the PUT traversed browser → Next proxy → API, and wrote nothing.
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { success?: boolean };
    expect(body.success).toBe(false);

    // And nothing changed: the gate must STAY unarmed on staging.
    const after = await page.request.get('/admin/api/app/requirements');
    expect(after.status()).toBe(200);
    expect(await after.json()).toEqual(beforeBody);
  });
});
