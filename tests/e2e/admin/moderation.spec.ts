import { expect, test } from '@playwright/test';

import { skipWithoutAdminSession } from '../helpers/session';

skipWithoutAdminSession();

/**
 * The moderation queue's CONTENTS are staging-state-dependent (reports are
 * filed by humans and swept by reseeds), so the data assertion here is the
 * queue itself: the server-derived unresolved badge and the table/empty
 * rendering — with the error state explicitly ruled out. The review panel
 * (`POST /reports/:id/review`) is never opened.
 */
test.describe('Moderation', () => {
  test('renders the queue with a server-derived unresolved count', async ({ page }) => {
    await page.goto('/admin/moderation');

    await expect(page.getByRole('heading', { name: 'Moderation' })).toBeVisible();
    await expect(page.getByText('Failed to load reports')).toHaveCount(0);

    // The badge's number comes from the API — it renders only off real data.
    await expect(page.getByText(/^\d+ unresolved$/)).toBeVisible();

    // The queue rendered: either rows (a Review link) or the honest
    // empty-queue sentence for the current filter — never neither.
    const reviewLink = page.getByRole('link', { name: 'Review' }).first();
    const emptyQueue = page.getByText(/^No .*reports\.$/).first();
    await expect(reviewLink.or(emptyQueue)).toBeVisible();
  });
});
