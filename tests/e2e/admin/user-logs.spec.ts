import { expect, test } from '@playwright/test';

import { ADMIN_EMAIL } from '../helpers/env';
import { skipWithoutAdminSession } from '../helpers/session';

skipWithoutAdminSession();

/**
 * ⚠️ EXACTLY ONE FETCH PER RUN. Every `Fetch logs` press writes an
 * `admin.user_logs_viewed` audit row server-side (poolmobile #263) — that is
 * the page's design, not a side effect to engineer around — so this spec
 * fetches once, for the admin's OWN account. That target also guarantees the
 * timeline is non-empty: this very suite's proxied requests put the admin's
 * user id on staging's log lines minutes before this spec runs.
 */
test.describe('User logs', () => {
  test('is request-driven, then renders a non-empty timeline', async ({ page }) => {
    await page.goto('/admin/user-logs');

    await expect(page.getByRole('heading', { name: 'User logs' })).toBeVisible();

    // Deliberately nothing is fetched until a user is chosen.
    await expect(page.getByText('Nothing is loaded until you do.')).toBeVisible();
    const fetchButton = page.getByRole('button', { name: 'Fetch logs' });
    await expect(fetchButton).toBeDisabled();

    // Pick the admin account through the shared UserPicker.
    await page.getByPlaceholder('Search by email, username, or name...').fill(ADMIN_EMAIL);
    await page.getByRole('button', { name: 'Choose' }).first().click();

    await expect(fetchButton).toBeEnabled();
    await fetchButton.click();

    await expect(page.getByText(/Could not fetch this user/)).toHaveCount(0);
    await expect(page.getByText('Timeline', { exact: true })).toBeVisible({ timeout: 45_000 });
    await expect(
      page.getByText('Nothing was recorded for this user in this window.'),
    ).toHaveCount(0);
  });
});
