import { expect, test } from '@playwright/test';

import { expectStagingBanner, expectStatTileValue } from '../helpers/asserts';
import { skipWithoutAdminSession } from '../helpers/session';

skipWithoutAdminSession();

test.describe('Overview', () => {
  test('renders metrics data, not the error card', async ({ page }) => {
    await page.goto('/admin/overview');

    await expectStagingBanner(page);
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();

    // The all-nine-calls-failed state.
    await expect(page.getByText('Could not load metrics')).toHaveCount(0);

    // Real numbers, not the `—` a failed panel renders. Staging is seeded, so
    // these are non-degenerate; `0` would still be data, `—` is a failure.
    await expectStatTileValue(page, 'Total pools', /^\d[\d,]*$/);
    await expectStatTileValue(page, 'Signups (all time)', /^\d[\d,]*$/);

    // A chart card title that only renders alongside the series data.
    await expect(page.getByText('Signups per day')).toBeVisible();
  });

  test('is grouped into the five labelled sections and the range scopes them (#31)', async ({
    page,
  }) => {
    await page.goto('/admin/overview');
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();

    // Each section is a landmark named by its own heading — the reader (and a
    // screen reader) can jump between them rather than scroll a wall.
    for (const name of ['Growth', 'Activation', 'Pools', 'Engagement & money', 'Health']) {
      await expect(page.getByRole('region', { name })).toBeVisible();
      await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible();
    }

    // Nothing was removed in the regroup: every pre-#31 panel is still here.
    for (const panel of [
      'DAU',
      'Signups (all time)',
      'Un-activated — held at (all time)',
      'Total pools',
      'New pools per day',
      'Pools by type',
      'Pools by status',
      'Pools by visibility',
      'Total transactions',
      'Transactions per day',
      'Transactions by status',
      'Points cohort',
      'Money events (counts only)',
    ]) {
      await expect(page.getByText(panel, { exact: true }).first()).toBeVisible();
    }
    // Health links into Errors & Health rather than duplicating it.
    await expect(page.getByRole('link', { name: 'Open Errors & Health' })).toHaveAttribute(
      'href',
      '/admin/errors',
    );

    // The one range control still scopes every windowed section: switching it
    // re-labels the window-bound tile AND every windowed section heading.
    await page.getByRole('combobox', { name: 'Date range' }).click();
    await page.getByRole('option', { name: 'Last 7 days' }).click();
    await expect(page.getByText('Signups (last 7d)', { exact: true })).toBeVisible();
    for (const name of ['Growth', 'Activation', 'Pools', 'Engagement & money']) {
      await expect(page.getByRole('region', { name })).toContainText('Last 7 days');
    }
    // Health is live, not windowed, and its heading says so.
    await expect(page.getByRole('region', { name: 'Health' })).toContainText('Live');
  });
});
