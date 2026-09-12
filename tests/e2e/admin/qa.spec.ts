import { expect, test } from '@playwright/test';

import { skipWithoutAdminSession } from '../helpers/session';

skipWithoutAdminSession();

/**
 * ⚠️ THE QA CONSOLE IS DESTRUCTIVE BY DESIGN — reseed, wipe, reset-account,
 * broadcast-to-everyone, force-pool-status. This spec asserts the page
 * RENDERS on staging and interacts with NOTHING: no tab switch, no Preview
 * (even Preview POSTs), no button of any kind.
 */
test.describe('QA console', () => {
  test('renders enabled on staging — and is never touched', async ({ page }) => {
    await page.goto('/admin/qa');

    // A disabled console redirects to the overview; still being here IS the
    // "enabled and rendered" assertion.
    await expect(page).toHaveURL(/\/admin\/qa$/);
    await expect(page.getByRole('heading', { name: 'QA console' })).toBeVisible();
    await expect(page.getByText('QA console unavailable')).toHaveCount(0);

    // Rendered off the real `GET /qa/status` payload.
    await expect(page.getByText('Everything here is real')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Jobs' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'State' })).toBeVisible();
  });
});
