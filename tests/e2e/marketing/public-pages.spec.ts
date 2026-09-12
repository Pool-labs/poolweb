import { expect, test } from '@playwright/test';

/**
 * Marketing site — public pages render. No session, no writes: the contact
 * form is never submitted (it emails via Resend), and `/join`'s inert mock
 * form is never touched.
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

  test('privacy policy renders its sections', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
    await expect(page.getByText('1. Information We Collect')).toBeVisible();
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

  test('join-a-pool mock page renders', async ({ page }) => {
    await page.goto('/join');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Join a Pool');
  });
});
