import { expect, test } from '@playwright/test';

import { skipWithoutAdminSession } from '../helpers/session';

skipWithoutAdminSession();

/**
 * The View-as dialog's copy feedback (poolweb #30).
 *
 * ⚠️ THIS SPEC WRITES: starting a session mints a real 15-minute read-only
 * impersonation token on staging and two audit rows (`admin.impersonation_started`
 * / `_ended`). That is the only way to reach the one-time token phase where
 * the `Copy token` control lives, so it is accepted — scoped to staging by
 * the harness, named in the reason, and the session is ENDED at the end
 * through the Admins page so a re-run never trips the one-live-session rule.
 * If a live session already exists (409), the spec skips rather than ending
 * someone else's.
 *
 * The clipboard itself is not asserted (Chromium headless has no real one);
 * the OUTCOME is — the two visible states and the live-region announcement,
 * driven by stubbing `navigator.clipboard.writeText` to resolve, then to
 * reject. Both outcomes are proven distinct and both revert.
 */
test.describe('View as — copy token feedback', () => {
  test('copy shows Copied / Couldn\'t copy, announces both, and reverts', async ({ page }) => {
    // Find a target that can be impersonated: not suspended, not a platform admin.
    await page.goto('/admin/users');
    await page.getByRole('link', { name: 'View', exact: true }).first().click();
    await page.waitForURL(/\/admin\/users\/[^/]+$/);

    const viewAs = page.getByRole('button', { name: 'View as', exact: true });
    await expect(viewAs).toBeVisible();
    test.skip(await viewAs.isDisabled(), 'First listed user cannot be impersonated');

    // Stub the clipboard BEFORE the dialog mounts: first call resolves, the
    // second rejects — the two outcomes this spec exists to tell apart.
    await page.evaluate(() => {
      let calls = 0;
      const stub = {
        writeText: () => {
          calls += 1;
          return calls === 1 ? Promise.resolve() : Promise.reject(new Error('NotAllowedError'));
        },
      };
      Object.defineProperty(navigator, 'clipboard', { value: stub, configurable: true });
    });

    await viewAs.click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Reason').fill('poolweb e2e #30 — copy-feedback check (ends itself)');
    await dialog.getByRole('button', { name: 'Start read-only session' }).click();

    // 409 = a live session already exists for this admin; not ours to end.
    const conflict = dialog.getByText(/End your current impersonation session/);
    const started = dialog.getByRole('heading', { name: 'Read-only session started' });
    await expect(started.or(conflict)).toBeVisible();
    test.skip(await conflict.isVisible(), 'This admin already has a live impersonation session');

    const copy = dialog.getByRole('button', { name: /^Copy token/ });
    const status = dialog.getByRole('status');

    // 1 — success: label flips, announced, then reverts so it can be reused.
    await copy.click();
    await expect(copy).toHaveText(/Copied/);
    await expect(status).toHaveText('Token copied to the clipboard.');
    await expect(copy).toHaveText(/Copy token/, { timeout: 5_000 });

    // 2 — failure: DISTINCT state, distinct announcement, manual fallback shown.
    await copy.click();
    await expect(copy).toHaveText(/Couldn.t copy/);
    await expect(status).toHaveText(/Could not copy the token/);
    await expect(page.getByTestId('copy-token-failure')).toBeVisible();
    await expect(copy).toHaveText(/Copy token/, { timeout: 10_000 });

    // Discard the token, then END the session so the next run can start one.
    await dialog.getByRole('button', { name: 'Done — discard the token' }).click();
    await expect(dialog).toHaveCount(0);

    await page.goto('/admin/admins');
    page.once('dialog', (d) => void d.accept());
    const end = page.getByRole('button', { name: 'End session' }).first();
    await expect(end).toBeVisible();
    await end.click();
    await expect(page.getByText(/Ended the session viewing as/)).toBeVisible();
  });
});
