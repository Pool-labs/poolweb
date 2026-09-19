import { expect, test } from '@playwright/test';

import { GEOGRAPHY, USERS_LIST } from '../fixtures/statsPayloads';
import { plantOfflineSession, serveAdminFixtures } from '../helpers/offlineAdmin';

/**
 * Geography + the city filter (poolweb #33 Part B), driven from fixtures.
 *
 * The thing worth testing here is not that a table renders — it is that the
 * canonical city KEY survives the round trip untouched. It is opaque, matched
 * by equality server-side and deliberately never normalized (pre-#128 and
 * pre-#469 legacy keys are published too), so a filter that tidied it would
 * return nothing and look exactly like an empty city.
 */

test.beforeEach(async ({ context }) => {
  await plantOfflineSession(context);
});

test.describe('Geography tab (fixtures)', () => {
  test('ranks by the selected measure and re-ranks when it changes', async ({ page }) => {
    await serveAdminFixtures(page);
    await page.goto('/admin/stats');
    await page.getByRole('tab', { name: 'Geography' }).click();

    await expect(page.getByRole('region', { name: 'Geography' })).toBeVisible();
    await expect(page.getByText('Users by city')).toBeVisible();

    // Columbia leads on users (18 vs 7); Austin leads on pools (9 vs 6).
    await page.getByRole('group', { name: 'Count' }).getByRole('button', { name: 'Pools' }).click();
    await expect(page.getByText('Pools by city')).toBeVisible();
  });

  test('says how many people have no city at all, rather than hiding them', async ({ page }) => {
    await serveAdminFixtures(page);
    await page.goto('/admin/stats');
    await page.getByRole('tab', { name: 'Geography' }).click();

    const tile = page.getByText('Users with no city', { exact: true }).locator('xpath=../..');
    await expect(tile).toContainText('11');
    await expect(tile).toContainText('not an error');
  });

  test('the map panel states what it could NOT plot', async ({ page }) => {
    // ⚠️ THE WHOLE POINT OF THIS PANEL. A map looks complete by its nature, so
    // a city the server could not place — no curated anchor, no public pool to
    // average — disappears from it silently and reads as an absence of users.
    // Two of the fixture's three cities have a point; the third must be
    // ACCOUNTED FOR in words, right under the canvas.
    await serveAdminFixtures(page);
    await page.goto('/admin/stats');
    await page.getByRole('tab', { name: 'Geography' }).click();

    const map = page.getByText('Map', { exact: true }).locator('xpath=../../..');
    await expect(map).toContainText('Plotted:');
    await expect(map).toContainText('not on the map');
    await expect(map).toContainText('the table below lists more than you can see');
    await expect(map).toContainText('exact-venue');
    await expect(map).not.toContainText('No data');

    // ⚠️ The stale copy this replaced. poolmobile#649 shipped the tiles CORS
    // rule and the renderer now exists, so neither the "blocked" nor the "not
    // built" wording may come back — both are false, and both would send the
    // next reader to fix something that is already done.
    await expect(map).not.toContainText('not readable from a browser yet');
    await expect(map).not.toContainText('not built yet');
  });

  test('the map canvas stays INSIDE its card', async ({ page }) => {
    /**
     * ⚠️ THE GLITCH THIS EXISTS FOR WAS REPORTED FROM THE LIVE SITE: the map
     * painted at the TOP OF THE PAGE, nowhere near its card.
     *
     * MapLibre positions its canvas absolutely, so it needs a positioned
     * ancestor. `.maplibregl-map { position: relative }` comes from MapLibre's
     * own stylesheet — which was imported inside a component loaded through
     * `next/dynamic({ ssr: false })`, so it landed in the dynamic chunk and was
     * not in effect when the canvas first painted. It now lives in
     * `globals.css`, and the container carries `relative` as well.
     *
     * ⚠️ THIS TEST DID NOT CATCH THAT BUG, AND THE NOTE IS HERE SO NOBODY
     * TRUSTS IT TO. It was written for it, the fix was then reverted
     * underneath it, and the suite stayed GREEN — because the bug is a TIMING
     * one: by the time any assertion runs, the dynamic chunk carrying the
     * stylesheet has loaded and the canvas sits where it belongs. The real
     * guard is the source scan in `tests/unit/admin/mapStylesheet.test.ts`,
     * which is deterministic.
     *
     * What this DOES hold is the standing invariant — the canvas belongs
     * inside its card — which is cheap here, needs no network (the canvas
     * exists whether or not a tile ever arrives) and would catch a layout
     * change that moved it for some other reason.
     */
    await serveAdminFixtures(page);
    await page.goto('/admin/stats');
    await page.getByRole('tab', { name: 'Geography' }).click();

    const card = page.getByText('Map', { exact: true }).locator('xpath=../../..');
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeAttached();

    const cardBox = await card.boundingBox();
    const canvasBox = await canvas.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(canvasBox).not.toBeNull();

    // Top edge within the card, not at the top of the document.
    expect(canvasBox!.y).toBeGreaterThanOrEqual(cardBox!.y - 2);
    expect(canvasBox!.y).toBeLessThan(cardBox!.y + cardBox!.height);
    // And horizontally within it too, so a half-escaped canvas fails as well.
    expect(canvasBox!.x).toBeGreaterThanOrEqual(cardBox!.x - 2);
  });

  test('a basemap that cannot load says so, and never renders a silent blank', async ({
    page,
  }) => {
    // ⚠️ The failure this test exists for is INVISIBLE: MapLibre reports a
    // failed style and carries on painting an empty canvas, which on a map of
    // where your users are reads as "nowhere". The offline helper refuses the
    // tiles, which is exactly that case (and also what a browser with no WebGL
    // produces).
    await serveAdminFixtures(page);
    await page.goto('/admin/stats');
    await page.getByRole('tab', { name: 'Geography' }).click();

    const map = page.getByText('Map', { exact: true }).locator('xpath=../../..');
    await expect(map.getByText('The map could not be drawn.')).toBeVisible();
    await expect(map).toContainText('says nothing about where your users are');

    // And the data beside it is untouched — the failure is scoped to the canvas.
    await expect(page.getByText('Columbia, MO').first()).toBeVisible();
  });

  test('a city row links to the list with the key passed through EXACTLY', async ({ page }) => {
    await serveAdminFixtures(page);
    await page.goto('/admin/stats');
    await page.getByRole('tab', { name: 'Geography' }).click();

    // The legacy key with an empty region segment is the interesting one:
    // nothing may "fix" it on the way to the URL.
    await expect(page.getByRole('link', { name: 'Open users in Amman' })).toHaveAttribute(
      'href',
      '/admin/users?city=amman%7C%7CJO',
    );
  });
});

test.describe('City filter (fixtures)', () => {
  test('sends the key the server published, not the name on screen', async ({ page }) => {
    const seen: string[] = [];
    await serveAdminFixtures(page, { overrides: { users: USERS_LIST } });
    await page.route('**/admin/api/users*', async (route) => {
      seen.push(new URL(route.request().url()).search);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: USERS_LIST }),
      });
    });

    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();

    await page.getByRole('combobox', { name: 'Filter by city' }).fill('Columbia');
    await page.getByRole('option', { name: /Columbia/ }).click();

    await expect.poll(() => seen.some((s) => s.includes('city=columbia%7CMO%7CUS'))).toBe(true);
    // The chip names the city in words; the wire carries the key.
    await expect(page.getByText('Columbia, MO')).toBeVisible();
  });

  test('an inbound ?city= link filters on arrival', async ({ page }) => {
    const seen: string[] = [];
    await serveAdminFixtures(page);
    await page.route('**/admin/api/users*', async (route) => {
      seen.push(new URL(route.request().url()).search);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: USERS_LIST }),
      });
    });

    await page.goto('/admin/users?city=amman%7C%7CJO');

    await expect.poll(() => seen.some((s) => s.includes('city=amman%7C%7CJO'))).toBe(true);
    await expect(page.getByRole('button', { name: 'Clear city' })).toBeVisible();
  });

  test('clearing the filter drops the parameter entirely', async ({ page }) => {
    const seen: string[] = [];
    await serveAdminFixtures(page);
    await page.route('**/admin/api/users*', async (route) => {
      seen.push(new URL(route.request().url()).search);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: USERS_LIST }),
      });
    });

    await page.goto('/admin/users?city=columbia%7CMO%7CUS');
    await expect(page.getByRole('button', { name: 'Clear city' })).toBeVisible();
    seen.length = 0;

    await page.getByRole('button', { name: 'Clear city' }).click();

    // An empty `city=` is NOT the same as no `city` — the schema rejects a
    // blank one, so the parameter has to disappear.
    await expect.poll(() => seen.length).toBeGreaterThan(0);
    expect(seen.every((s) => !s.includes('city='))).toBe(true);
  });

  test('a failed city list disables the filter and says the rows are unfiltered', async ({
    page,
  }) => {
    // ⚠️ The honest degradation: a dead filter must not read as "this city is
    // empty". The list below it is unfiltered, and the copy says so.
    await serveAdminFixtures(page, { fail: ['metrics/geography'] });
    await page.route('**/admin/api/users*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: USERS_LIST }),
      });
    });

    await page.goto('/admin/users');
    await expect(page.getByPlaceholder('City list unavailable')).toBeDisabled();
    await expect(page.getByText(/the rows below are unfiltered, not empty/)).toBeVisible();
  });

  test('the Users list shows a City column', async ({ page }) => {
    await serveAdminFixtures(page);
    await page.route('**/admin/api/users*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: USERS_LIST }),
      });
    });

    await page.goto('/admin/users');
    await expect(page.getByRole('columnheader', { name: 'City' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Columbia, MO' })).toBeVisible();
  });

  test('an API that does not report a city renders — rather than blank', async ({ page }) => {
    // Pre-#624 list rows carry no city at all. The column shows `—`.
    await serveAdminFixtures(page);
    await page.route('**/admin/api/users*', async (route) => {
      const { locationCity, locationCityKey, ...legacy } = USERS_LIST.users[0];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { ...USERS_LIST, users: [legacy] },
        }),
      });
    });

    await page.goto('/admin/users');
    await expect(page.getByRole('columnheader', { name: 'City' })).toBeVisible();
    // The row is there and the City cell reads `—`, not a gap in the table.
    const row = page.getByRole('row', { name: /someone@example\.com/ });
    await expect(row).toBeVisible();
    await expect(row.getByRole('cell').nth(2)).toHaveText('—');
  });
});

/** The fixture the geography specs lean on, kept honest. */
test('the geography fixture keeps a legacy two-segment key', () => {
  expect(GEOGRAPHY.cities.some((c) => c.key.split('|').length === 3 && c.regionCode === null)).toBe(
    true,
  );
});
