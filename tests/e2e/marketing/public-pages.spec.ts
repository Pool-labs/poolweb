import { expect, test } from '@playwright/test';

/**
 * Marketing site — public pages render. No session, no writes: the contact
 * form is never submitted (it emails via Resend).
 */
test.describe('Marketing pages', () => {
  test('home renders the hero', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Pool. Tap. Done.');
  });

  test('FAQ renders', async ({ page }) => {
    await page.goto('/faq');
    // The heading's "WTF" is a styled span — match the stable substring.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Is Pool?');
  });

  // The legal pages are generated from poolmobile docs/legal/ (#595) — assert
  // the OFFICIAL documents render, not the pre-2026 policy these replaced.
  test('privacy policy renders the official document', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Pool — Privacy Policy' })).toBeVisible();
    await expect(page.getByText('operated by Pool Labs Inc.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Information we collect' })).toBeVisible();
  });

  test('terms of service renders the official document', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: 'Pool — Terms of Service' })).toBeVisible();
    await expect(page.getByText('Pool Labs Inc., a Delaware corporation')).toBeVisible();
    // The one sentence the whole product hangs on (#392, pinned in-app too).
    await expect(
      page.getByRole('heading', { name: 'What Pool is — and is not' }),
    ).toBeVisible();
  });

  test('footer links both legal documents', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    await expect(page.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute(
      'href',
      '/terms',
    );
  });

  test('contact page renders its form (never submitted)', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Contact Us');
    await expect(page.getByText('Send us a Message')).toBeVisible();
  });

  test('download page renders', async ({ page }) => {
    await page.goto('/download');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Get Pool');
  });

  // #595 removed the six v0 prototype pages (they claimed card-rail payments
  // and shipping Pool Cards). Pin that they STAY gone — a revert restoring
  // them would put those claims back on the public site.
  test('the removed prototype pages stay removed', async ({ page }) => {
    for (const path of ['/join', '/create', '/pay', '/wallet', '/pools']) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} should 404`).toBe(404);
    }
  });
});
