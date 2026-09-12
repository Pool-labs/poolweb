import { expect, test } from '@playwright/test';

import { skipWithoutAdminSession } from '../helpers/session';

skipWithoutAdminSession();

/**
 * The Waitlist tab is PRODUCTION-ONLY (poolmobile #602): it reads — and can
 * delete — real marketing-site signups straight from the single production
 * Firestore, whatever the env switcher says. On staging the correct rendering
 * is therefore ABSENCE: no nav entry, and the route itself 404s server-side
 * before any Firestore read can happen.
 */
test.describe('Waitlist (staging)', () => {
  test('is absent from the nav and 404s at its URL', async ({ page }) => {
    await page.goto('/admin/overview');
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Waitlist' })).toHaveCount(0);

    // `notFound()` fires inside a streamed render (the root loading.tsx opens
    // a Suspense boundary), so the HTTP status is 200 with the not-found UI
    // streamed in — assert the rendered outcome, not the status code.
    await page.goto('/admin/dashboard');
    await expect(page.getByText('This page could not be found')).toBeVisible();
    // And none of the waitlist's Firestore-backed UI ever rendered.
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toHaveCount(0);
    await expect(page.getByText('Pre-registered')).toHaveCount(0);
  });
});
