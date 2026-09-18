import { expect, test, type Page } from '@playwright/test';

import { USERS_LIST } from '../fixtures/statsPayloads';
import { plantOfflineSession, serveAdminFixtures } from '../helpers/offlineAdmin';

/**
 * The admin surface at phone width (poolweb#33).
 *
 * ⚠️ WHY THIS EXISTS. The first mobile pass found a defect the desktop
 * screenshots could never show: the Users list rendered six columns at 390px,
 * so `View` — the only control that makes a row useful — sat off the right
 * edge, reachable only by a horizontal scroll with no affordance. The row was
 * readable and un-openable. The Geography table lost its Pools, New and Open
 * columns the same way.
 *
 * So the assertions here are about the two things that actually break:
 *   1. the PAGE never scrolls sideways (a table may, inside its own box);
 *   2. the row ACTION is visible without scrolling, on every list.
 */

const PHONE = { width: 390, height: 844 };

test.use({ viewport: PHONE });

test.beforeEach(async ({ context }) => {
  await plantOfflineSession(context);
});

/**
 * The page itself must not scroll sideways. Checked on `documentElement`, not
 * on a locator, because a wide element INSIDE an `overflow-x-auto` box (the nav
 * strip, a table) is fine — what is not fine is the document growing past the
 * viewport, which is the thing that makes a whole page feel broken.
 */
async function expectNoPageOverflow(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, 'the page should not scroll sideways at phone width').toBeLessThanOrEqual(
    clientWidth,
  );
}

const TABS = [
  'Growth',
  'Activity',
  'Pools',
  'Money',
  'Engagement',
  'Funnels',
  'Geography',
  'Health',
];

test.describe('Stats at phone width', () => {
  test('every tab fits the viewport', async ({ page }) => {
    await serveAdminFixtures(page);
    await page.goto('/admin/stats');

    for (const tab of TABS) {
      await page.getByRole('tab', { name: tab }).click();
      await expect(page.getByRole('region', { name: tab })).toBeVisible();
      await expectNoPageOverflow(page);
    }
  });

  test('the Geography table keeps its counts and its link on a phone', async ({ page }) => {
    await serveAdminFixtures(page);
    await page.goto('/admin/stats');
    await page.getByRole('tab', { name: 'Geography' }).click();

    // ⚠️ Asserted on the table's own SCROLL BOX, not with `toBeInViewport`:
    // this table sits far down a long page, so "in the viewport" is a question
    // about how far the reader has scrolled, not about the layout. What must be
    // true is that the table has nothing hidden to its right.
    const overflow = await page
      .getByRole('row', { name: /Columbia/ })
      .evaluate((row) => {
        const box = row.closest('div.overflow-auto, div.overflow-x-auto') as HTMLElement | null;
        if (!box) return null;
        return { scrollWidth: box.scrollWidth, clientWidth: box.clientWidth };
      });
    expect(overflow, 'the city table should sit in a scroll box').not.toBeNull();
    expect(
      overflow!.scrollWidth,
      'the city table should have no columns hidden off its right edge',
    ).toBeLessThanOrEqual(overflow!.clientWidth);

    // The row still carries what it is for: the counts and the way through.
    const row = page.getByRole('row', { name: /Columbia/ });
    await expect(row.getByRole('link', { name: /^Open users in/ })).toBeVisible();

    // The columns that drop are the derivable ones, and only those.
    await expect(page.getByRole('columnheader', { name: 'Users' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Pools' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Region' })).toBeHidden();
  });
});

test.describe('Lists at phone width', () => {
  test('a Users row can still be OPENED, not just read', async ({ page }) => {
    await serveAdminFixtures(page);
    await page.route('**/admin/api/users*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: USERS_LIST }),
      });
    });

    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    await expectNoPageOverflow(page);

    // ⚠️ The regression: `toBeInViewport`, not `toBeVisible`. A control pushed
    // past the right edge of a scrollable box is "visible" to Playwright and
    // unreachable to a thumb.
    await expect(page.getByRole('link', { name: 'View', exact: true }).first()).toBeInViewport();

    // The city is still shown — it is the filter's own feedback.
    await expect(page.getByRole('cell', { name: 'Columbia, MO' })).toBeVisible();
    // Email is the column that yields.
    await expect(page.getByRole('columnheader', { name: 'Email' })).toBeHidden();
  });

  test('the city filter and its dropdown fit', async ({ page }) => {
    await serveAdminFixtures(page);
    await page.route('**/admin/api/users*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: USERS_LIST }),
      });
    });

    await page.goto('/admin/users');
    await page.getByRole('combobox', { name: 'Filter by city' }).click();
    await expect(page.getByRole('option', { name: /Columbia/ })).toBeInViewport();
    await expectNoPageOverflow(page);

    await page.getByRole('option', { name: /Columbia/ }).click();
    await expect(page.getByRole('button', { name: 'Clear city' })).toBeInViewport();
    await expectNoPageOverflow(page);
  });

  test('the create dialogs fit a phone', async ({ page }) => {
    // New UI is new chances to overflow, and these are modal — a control that
    // lands off-screen in a dialog has no page scroll to rescue it.
    await serveAdminFixtures(page);
    await page.route('**/admin/api/users*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: USERS_LIST }),
      });
    });

    await page.goto('/admin/users');
    await page.getByRole('button', { name: 'New user' }).click();
    await expect(page.getByLabel('Email')).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeInViewport();
    await expectNoPageOverflow(page);
  });

  test('a Pools row keeps its balance and its link', async ({ page }) => {
    await serveAdminFixtures(page);
    await page.route('**/admin/api/pools*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            pools: [
              {
                id: 'pool-1',
                name: 'Thursday football',
                status: 'ACTIVE',
                visibility: 'PUBLIC',
                isSuspended: false,
                deletedAt: null,
                balanceCents: 48_000,
                memberCount: 6,
                creatorId: 'user-1',
                createdAt: '2026-08-20T10:00:00.000Z',
                locationCity: 'Columbia, MO',
                locationCityKey: 'columbia|MO|US',
              },
            ],
            total: 1,
            limit: 25,
            offset: 0,
          },
        }),
      });
    });

    await page.goto('/admin/pools');
    await expect(page.getByRole('heading', { name: 'Pools' })).toBeVisible();
    await expectNoPageOverflow(page);

    await expect(page.getByRole('link', { name: 'View', exact: true }).first()).toBeInViewport();
    // Money survives the squeeze; Visibility and Created are what yield.
    await expect(page.getByRole('cell', { name: '$480.00' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Visibility' })).toBeHidden();
  });
});
