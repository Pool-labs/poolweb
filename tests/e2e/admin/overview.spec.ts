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
});
