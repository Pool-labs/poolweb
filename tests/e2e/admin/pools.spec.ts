import { expect, test } from '@playwright/test';

import { expectStatTileValue } from '../helpers/asserts';
import { skipWithoutAdminSession } from '../helpers/session';

skipWithoutAdminSession();

/**
 * ⚠️ READ-ONLY BY DISCIPLINE: the pool detail page carries `Suspend pool` /
 * `Restore pool`. This spec clicks only the `View` link and the read-only
 * ledger tab triggers.
 */
test.describe('Pools', () => {
  test('list renders rows and a detail page renders the ledger', async ({ page }) => {
    await page.goto('/admin/pools');

    await expect(page.getByRole('heading', { name: 'Pools' })).toBeVisible();
    await expect(page.getByText('Failed to load pools')).toHaveCount(0);
    await expect(page.getByText('No pools found')).toHaveCount(0);
    await expect(page.getByText(/Showing 1–\d+ of \d+/)).toBeVisible();

    // exact: true — role-name matching is substring by default ('View' would
    // otherwise match the nav's 'Overview' link first).
    await page.getByRole('link', { name: 'View', exact: true }).first().click();
    await page.waitForURL(/\/admin\/pools\/[^/]+$/);

    await expect(page.getByText('Failed to load pool')).toHaveCount(0);
    await expect(page.getByText('Pool not found')).toHaveCount(0);

    // Money tiles render formatted cents — `$…` — not the `—` placeholder.
    await expectStatTileValue(page, 'Balance', /^\$/);
    await expectStatTileValue(page, 'Total deposited', /^\$/);

    // #82's read-only ledger: the tab triggers carry counts ONLY when the
    // ledger summary call succeeded — a bare `Deposits` means it failed.
    await expect(page.getByText('Ledger (read-only)')).toBeVisible();
    await expect(page.getByRole('tab', { name: /Deposits \(\d+\)/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Balances \(\d+\)/ })).toBeVisible();
  });
});
