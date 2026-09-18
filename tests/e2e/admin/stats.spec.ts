import { expect, test, type Page } from '@playwright/test';

import { expectStagingBanner, expectStatTileValue } from '../helpers/asserts';
import { skipWithoutAdminSession } from '../helpers/session';

skipWithoutAdminSession();

/** Open a Stats tab by name and wait for its section to be the visible one. */
async function openTab(page: Page, name: string): Promise<void> {
  await page.getByRole('tab', { name }).click();
  await expect(page.getByRole('region', { name })).toBeVisible();
}

/**
 * Stats (poolweb #33) — the tabbed page that replaced Overview.
 *
 * Read-only throughout: the only controls this spec touches are the tabs, the
 * range select and the refresh button.
 */
test.describe('Stats', () => {
  test('replaces Overview, and the old URL still lands somewhere real', async ({ page }) => {
    // The Overview was the admin's landing page for months. A 404 on a
    // bookmarked URL reads as "the dashboard is broken", so the route redirects.
    await page.goto('/admin/overview');
    await page.waitForURL('**/admin/stats');

    await expectStagingBanner(page);
    await expect(page.getByRole('heading', { name: 'Stats', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Stats' })).toHaveAttribute('href', '/admin/stats');
    await expect(page.getByRole('link', { name: 'Overview' })).toHaveCount(0);

    // The all-calls-failed state.
    await expect(page.getByText('Could not load metrics')).toHaveCount(0);
  });

  test('every figure the Overview showed is still here, across the tabs', async ({ page }) => {
    await page.goto('/admin/stats');

    // Growth — the default tab.
    await expect(page.getByRole('region', { name: 'Growth' })).toBeVisible();
    await expectStatTileValue(page, 'Signups (all time)', /^\d[\d,]*$/);
    await expect(page.getByText('Signups per day')).toBeVisible();
    await expect(page.getByText('Un-activated — held at')).toBeVisible();

    await openTab(page, 'Activity');
    for (const tile of ['DAU', 'WAU', 'MAU']) {
      await expectStatTileValue(page, tile, /^\d[\d,]*$/);
    }
    await expect(page.getByText('Accounts by last seen')).toBeVisible();

    await openTab(page, 'Pools');
    await expectStatTileValue(page, 'Total pools', /^\d[\d,]*$/);
    for (const panel of [
      'New pools per day',
      'Pools by status',
      'Pools by visibility',
      'Pools by type',
    ]) {
      await expect(page.getByText(panel, { exact: true })).toBeVisible();
    }

    await openTab(page, 'Money');
    await expectStatTileValue(page, 'Transactions (all time)', /^\d[\d,]*$/);
    await expect(page.getByText('Transactions per day')).toBeVisible();
    await expect(page.getByText('Money events', { exact: true })).toBeVisible();

    await openTab(page, 'Engagement');
    await expectStatTileValue(page, 'Points cohort', /^\d[\d,]*$/);

    await openTab(page, 'Funnels');
    for (const funnel of [
      'Auth funnel',
      'Pool — create path',
      'Pool — join path',
      'Discover funnel',
    ]) {
      await expect(page.getByText(funnel, { exact: true })).toBeVisible();
    }

    // Health links into Errors & Health rather than duplicating it.
    await openTab(page, 'Health');
    await expect(page.getByRole('link', { name: 'Open Errors & Health' })).toHaveAttribute(
      'href',
      '/admin/errors',
    );
  });

  test('the new #33 panels render: categories, size, settlements, points', async ({ page }) => {
    await page.goto('/admin/stats');

    await openTab(page, 'Pools');
    await expect(page.getByText('Pools by category')).toBeVisible();
    await expect(page.getByText('Pools by size')).toBeVisible();
    await expect(page.getByText('Public vs private, per day')).toBeVisible();
    await expectStatTileValue(page, 'Suspended pools', /^\d[\d,]*$/);

    await openTab(page, 'Money');
    await expect(page.getByText('Settlements by status')).toBeVisible();
    await expectStatTileValue(page, 'Deposits (last 30d)', /^\d[\d,]*$/);

    await openTab(page, 'Engagement');
    await expect(page.getByText('Points awarded by earning rule')).toBeVisible();
    await expect(page.getByText('Daily-cap hit rate')).toBeVisible();
  });

  test('tiles carry a delta against the named previous window', async ({ page }) => {
    await page.goto('/admin/stats');

    // The comparison window is NAMED on the tile — a delta with no stated
    // baseline is a number nobody can check.
    await expect(page.getByText('vs the 30 days before').first()).toBeVisible();
    // ▲ / ▼ / — : direction survives greyscale, so colour is never the only cue.
    await expect(page.getByText(/[▲▼—]/).first()).toBeVisible();

    await page.getByRole('combobox', { name: 'Date range' }).click();
    await page.getByRole('option', { name: 'Last 7 days' }).click();
    await expect(page.getByText('vs the 7 days before').first()).toBeVisible();
  });

  test('one range control scopes every windowed tab, and says where it does not', async ({
    page,
  }) => {
    await page.goto('/admin/stats');

    await page.getByRole('combobox', { name: 'Date range' }).click();
    await page.getByRole('option', { name: 'Last 7 days' }).click();
    await expect(page.getByText('Signups (last 7d)', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Growth' })).toContainText('Last 7 days');

    for (const tab of ['Pools', 'Money', 'Engagement', 'Funnels']) {
      await openTab(page, tab);
      await expect(page.getByRole('region', { name: tab })).toContainText('Last 7 days');
    }

    // ⚠️ Three tabs are NOT scoped by the range, and each says so rather than
    // letting the control imply it filtered something.
    await openTab(page, 'Activity');
    await expect(page.getByRole('region', { name: 'Activity' })).toContainText('Snapshot');
    await openTab(page, 'Health');
    await expect(page.getByRole('region', { name: 'Health' })).toContainText('Live');
  });

  test('a panel that cannot be served says WHY, never "no data"', async ({ page }) => {
    await page.goto('/admin/stats');

    // The two panels that are empty by a written-down decision. This is the
    // #116 rule at its sharpest: an unexplained empty chart lets "we do not
    // serve this" pass for "nothing is happening".
    await openTab(page, 'Activity');
    await expect(page.getByText('The API does not serve this yet.').first()).toBeVisible();
    await expect(page.getByText(/poolmobile#648/)).toBeVisible();

    await openTab(page, 'Money');
    await expect(page.getByText('Volume in cents')).toBeVisible();
    await expect(page.getByText(/poolmobile#647/)).toBeVisible();
  });
});
