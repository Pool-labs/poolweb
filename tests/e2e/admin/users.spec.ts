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

    // exact: true — role-name matching is substring by default, so a bare
    // 'View' would match any nav link containing the word.
    await page.getByRole('link', { name: 'View', exact: true }).first().click();
    await page.waitForURL(/\/admin\/users\/[^/]+$/);

    await expect(page.getByText('Failed to load user')).toHaveCount(0);
    await expect(page.getByText('User not found')).toHaveCount(0);
    await expect(page.getByText('Identity', { exact: true })).toBeVisible();
    await expect(page.getByText('Memberships', { exact: true })).toBeVisible();
    await expect(page.getByText('User ID', { exact: true })).toBeVisible();
  });

  test('detail page is grouped into the #31 sections and links pools through', async ({ page }) => {
    await page.goto('/admin/users');
    await page.getByRole('link', { name: 'View', exact: true }).first().click();
    await page.waitForURL(/\/admin\/users\/[^/]+$/);
    await expect(page.getByText('User not found')).toHaveCount(0);

    // The six always-present section cards (Staging context renders only when
    // the payload carries a cohort/demo marker, so it is not asserted).
    for (const section of [
      'Identity',
      'Location',
      'Profile',
      'Engagement',
      'Payment handles',
      'Memberships',
    ]) {
      await expect(page.getByText(section, { exact: true }).first()).toBeVisible();
    }

    // Either the API is the widened poolmobile #618 shape and the sections
    // carry rows, or it is the narrow one and each says so in one line —
    // never a column of dashes pretending to be an empty profile.
    const unreported = page.getByText(/not reported by this API version/);
    const richRow = page.getByText('Last seen', { exact: true });
    await expect(unreported.or(richRow).first()).toBeVisible();

    // When the roster rows are present, each links to its pool detail page.
    const poolLinks = page.locator('a[href^="/admin/pools/"]');
    if ((await poolLinks.count()) > 0) {
      await expect(poolLinks.first()).toHaveAttribute('href', /^\/admin\/pools\/[^/]+$/);
    }
  });
});
