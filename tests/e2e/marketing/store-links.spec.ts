import { expect, test, type Page } from '@playwright/test';

import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/store-links';

/**
 * The App Store link, wherever a visitor can meet it.
 *
 * ⚠️ THE FAILURE THIS GUARDS IS THE MOST EMBARRASSING KIND: the app is live and
 * the website still says "coming soon", so a visitor who could install right
 * now is told the product does not exist. That is not a broken link anybody
 * gets an error page for — it just quietly costs every download.
 *
 * ⚠️ AND THE SECOND FAILURE IS A LINK THAT GOES NOWHERE. Pool is on the App
 * Store and NOT on Google Play, so a matching pair of store buttons would send
 * every Android visitor to a dead end. The asymmetry is deliberate and is
 * asserted in both directions: the iOS link is real, and the Play link is
 * absent rather than hopeful.
 *
 * These specs read `lib/store-links.ts` rather than hardcoding the URL, so when
 * Play goes live the constant is the only edit and the Android half of every
 * assertion below flips with it.
 */

/**
 * Pages carrying the link, and how to reveal it.
 *
 * ⚠️ The FAQ's answers live in a COLLAPSIBLE accordion, so the link is in the
 * DOM but not visible until the question is opened. A spec that asserted
 * visibility without opening it would fail on a perfectly good page — and one
 * that only checked the DOM would pass on a link no visitor can reach.
 */
const STORE_PAGES: { path: string; reveal?: (page: Page) => Promise<void> }[] = [
  { path: '/download' },
  { path: '/preregister' },
  {
    path: '/faq',
    reveal: async (page) => {
      await page.getByRole('button', { name: 'Where can I get the app?' }).click();
    },
  },
];

test.describe('App Store link', () => {
  for (const { path, reveal } of STORE_PAGES) {
    test(`${path} links to the real App Store listing`, async ({ page }) => {
      await page.goto(path);
      if (reveal) await reveal(page);

      const link = page.locator(`a[href="${APP_STORE_URL}"]`).first();
      await expect(link).toBeVisible();

      // ⚠️ The id is the listing. A link to apps.apple.com that carries the
      // wrong id is a live, clickable link to somebody else's app — which no
      // smoke test catches and no error page reveals.
      await expect(link).toHaveAttribute('href', /id6762954792/);

      // Opens out of the site, and safely: `target=_blank` without
      // `rel=noopener` hands the opened page a handle on this one.
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    });
  }

  test('the download page no longer says the stores are coming soon', async ({ page }) => {
    // ⚠️ The stale copy this replaced. It is not enough to add the link — the
    // old sentence has to go, or the page contradicts itself and the reader
    // believes the pessimistic half.
    await page.goto('/download');

    await expect(page.getByText('Pool is live on the App Store')).toBeVisible();
    await expect(page.getByText('Coming soon', { exact: true })).toHaveCount(0);
    await expect(
      page.getByText('The App Store and Google Play links will appear here at launch.'),
    ).toHaveCount(0);
  });

  test('Android is told the truth, with nothing to tap', async ({ page }) => {
    test.skip(PLAY_STORE_URL !== null, 'Google Play is live — the other branch applies.');
    await page.goto('/download');

    await expect(page.getByText('Android is coming')).toBeVisible();
    await expect(page.getByText(/not on Google Play yet/)).toBeVisible();

    // ⚠️ NO link to Google Play at all. A disabled-looking button invites a tap
    // that cannot go anywhere, and a placeholder `play.google.com` URL would
    // 404 — which looks identical to a broken site.
    await expect(page.locator('a[href*="play.google.com"]')).toHaveCount(0);
  });

  test('preregister leads with the App Store, not with the waiting list', async ({ page }) => {
    // ⚠️ THE DEAD END THIS FIXES. `/preregister` is in the main nav and said
    // "be the first to know when our mobile app launches" — after it had
    // launched. An iPhone visitor was being asked to join a queue for
    // something already on their phone's store.
    await page.goto('/preregister');

    await expect(page.getByText('On iPhone? Pool is out now.')).toBeVisible();
    await expect(page.getByText(/No waiting list needed/)).toBeVisible();
    await expect(page.getByText('Be the first to know when our mobile app launches!')).toHaveCount(
      0,
    );

    // The App Store card comes BEFORE the form, so nobody signs up for
    // something they could already have.
    const storeCard = page.getByText('On iPhone? Pool is out now.');
    const form = page.getByRole('textbox').first();
    const cardBox = await storeCard.boundingBox();
    const formBox = await form.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(formBox).not.toBeNull();
    expect(cardBox!.y).toBeLessThan(formBox!.y);
  });

  test('the FAQ answers "where can I get it" with the link, not a promise', async ({ page }) => {
    await page.goto('/faq');
    await page.getByRole('button', { name: 'Where can I get the app?' }).click();

    await expect(page.getByText(/Pool is live on the/)).toBeVisible();
    // The old promise is gone from the page entirely, not merely superseded.
    await expect(page.getByText(/Pool is coming to iPhone and Android/)).toHaveCount(0);
  });
});
