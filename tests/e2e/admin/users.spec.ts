import { expect, test } from '@playwright/test';

import { skipWithoutAdminSession } from '../helpers/session';

skipWithoutAdminSession();

/**
 * ⚠️ READ-ONLY BY DISCIPLINE: the user detail page carries `Suspend user` /
 * `Restore user` and a feature-flag toggle. The only control this spec clicks
 * is the row's `View` link.
 */
test.describe('Users', () => {
  test('list renders rows and a detail page renders the account', async ({ page }) => {
    await page.goto('/admin/users');

    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    await expect(page.getByText('Failed to load users')).toHaveCount(0);
    await expect(page.getByText('No users found')).toHaveCount(0);

    // "Showing 1–25 of N" (en dash) only renders over a non-empty page.
    await expect(page.getByText(/Showing 1–\d+ of \d+/)).toBeVisible();

    // exact: true — role-name matching is substring by default, and a bare
    // 'View' would match the nav's 'Overview' link first.
    await page.getByRole('link', { name: 'View', exact: true }).first().click();
    await page.waitForURL(/\/admin\/users\/[^/]+$/);

    await expect(page.getByText('Failed to load user')).toHaveCount(0);
    await expect(page.getByText('User not found')).toHaveCount(0);
    await expect(page.getByText('Identity', { exact: true })).toBeVisible();
    await expect(page.getByText('Memberships', { exact: true })).toBeVisible();
    await expect(page.getByText('User ID', { exact: true })).toBeVisible();
  });
});
