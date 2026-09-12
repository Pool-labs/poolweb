import { expect, test } from '@playwright/test';

import { ADMIN_EMAIL } from '../helpers/env';
import { skipWithoutAdminSession } from '../helpers/session';

skipWithoutAdminSession();

/**
 * ⚠️ READ-ONLY BY DISCIPLINE: the page carries `Add admin` (a real grant) and
 * per-row `Remove` (a real revoke). Nothing here types into the email input
 * or presses either — the form also submits on Enter, so no keystrokes land
 * anywhere near it.
 */
test.describe('Admins', () => {
  test('renders the allowlist with the signed-in admin on it', async ({ page }) => {
    await page.goto('/admin/admins');

    await expect(page.getByRole('heading', { name: 'Admins' })).toBeVisible();
    await expect(page.getByText('Failed to load admins')).toHaveCount(0);
    await expect(page.getByText('No admins on the list')).toHaveCount(0);

    // Guaranteed data: the account this suite logged in as must be an active
    // admin here, or the login itself could not have succeeded.
    await expect(page.getByText(ADMIN_EMAIL)).toBeVisible();
    await expect(page.getByText('Active admin').first()).toBeVisible();
  });
});
