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

  test('the map panel blames the missing renderer, not the data', async ({ page }) => {
    // ⚠️ The whole point of the panel. "No data" would be false — two of the
    // three cities have a point and there is a venue pin ready.
    await serveAdminFixtures(page);
    await page.goto('/admin/stats');
    await page.getByRole('tab', { name: 'Geography' }).click();

    const map = page.getByText('Map', { exact: true }).locator('xpath=../../..');
    await expect(map).toContainText('not built yet');
    await expect(map).toContainText('maplibre-gl');
    await expect(map).toContainText('2');
    await expect(map).toContainText('exact-venue');
    await expect(map).not.toContainText('No data');
    // ⚠️ poolmobile#649 SHIPPED. The panel may say the block is history; it
    // may not still claim the tiles are unreadable, which is now false.
    await expect(map).not.toContainText('not readable from a browser yet');
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
