import { expect, test } from '@playwright/test';

import { skipWithoutAdminSession } from '../helpers/session';

skipWithoutAdminSession();

test.describe('Errors & Health', () => {
  test('renders a health verdict and the failures feed', async ({ page }) => {
    await page.goto('/admin/errors');

    await expect(page.getByRole('heading', { name: 'Errors & Health' })).toBeVisible();

    // A request-level failure poisons everything below it — rule it out first.
    await expect(page.getByText('Could not load the errors feed')).toHaveCount(0);

    // The plain-language verdict renders only once the sources answered —
    // its PRESENCE (any of the four verdicts) is the data signal; the
    // "Checking…" placeholder is the loading state.
    await expect(
      page.getByText(
        /Everything looks healthy|Serving, but something needs a look|Something is wrong right now|Can’t tell — something isn’t being watched/,
      ),
    ).toBeVisible({ timeout: 45_000 });

    // The feed cards render only off a successfully-read feed (exact: the
    // page's subtitle and the per-source failure notice both CONTAIN the
    // phrase). The CloudWatch read is allowed ONE transient failure — the
    // page is built to fail open per source — recovered with the page's own
    // read-only Refresh, never a reload loop.
    const feedCard = page.getByText('Recent failures', { exact: true });
    if (await page.getByText('Recent failures could not be read').isVisible()) {
      await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    }
    await expect(feedCard).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('Failures by signal', { exact: true })).toBeVisible();
  });
});
