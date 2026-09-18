import { expect, test, type Page } from '@playwright/test';

/**
 * The published legal documents at phone width.
 *
 * ⚠️ WHY A PHONE SPEC FOR THESE THREE PAGES. They are what an app-store
 * reviewer opens, usually on a handset, and Play's Child Safety Standards
 * policy requires `/child-safety` to be externally published and reachable.
 * The header shipped as `justify-between` with no wrap strategy, so at 390px
 * flex shrank the items below their content and the labels printed ON TOP of
 * each other — "Back to Ho[me]" underneath "Privacy Policy".
 */

const PHONE = { width: 390, height: 844 };
const LEGAL_PAGES = ['/privacy', '/terms', '/child-safety'] as const;

test.use({ viewport: PHONE });

/** Two rects overlap when they intersect on both axes. */
async function expectNoOverlap(page: Page, a: string, b: string): Promise<void> {
  const first = await page.getByRole('link', { name: a }).first().boundingBox();
  const second = await page.getByRole('link', { name: b }).first().boundingBox();
  expect(first, `"${a}" should be laid out`).not.toBeNull();
  expect(second, `"${b}" should be laid out`).not.toBeNull();
  const overlaps =
    first!.x < second!.x + second!.width &&
    second!.x < first!.x + first!.width &&
    first!.y < second!.y + second!.height &&
    second!.y < first!.y + first!.height;
  expect(overlaps, `"${a}" and "${b}" must not overlap at ${PHONE.width}px`).toBe(false);
}

for (const path of LEGAL_PAGES) {
  test(`${path} header does not collide on a phone`, async ({ page }) => {
    await page.goto(path);

    await expectNoOverlap(page, 'Back to Home', 'Privacy Policy');
    await expectNoOverlap(page, 'Back to Home', 'Terms of Service');
    await expectNoOverlap(page, 'Back to Home', 'Child Safety');

    // And the page itself never scrolls sideways.
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // The document itself rendered — the shell is not all that is on screen.
    await expect(page.locator('article.legal-doc')).toBeVisible();
  });
}
