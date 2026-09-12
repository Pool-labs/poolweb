import { expect, type Page } from '@playwright/test';

/**
 * Assert a stat tile (overview / pool detail) rendered a VALUE, not the `—`
 * placeholder a failed panel falls back to.
 *
 * The repo has no test ids, so the tile is located from its label: CardTitle →
 * CardHeader → Card, then the value div (`text-2xl`, or `text-xl` on the pool
 * detail's mono money tiles — the title's own `text-2xl` is overridden to
 * `text-xs` by tailwind-merge, so it can never match).
 */
export async function expectStatTileValue(
  page: Page,
  label: string,
  pattern: RegExp,
): Promise<void> {
  const card = page.getByText(label, { exact: true }).locator('xpath=../..');
  await expect(
    card.locator('div.text-2xl, div.text-xl'),
    `stat tile "${label}" should render data`,
  ).toHaveText(pattern);
}

/** The staging environment banner every page renders (server-resolved, #14). */
export async function expectStagingBanner(page: Page): Promise<void> {
  await expect(
    page.getByRole('region', { name: 'Current Pool environment: STAGING' }),
  ).toBeVisible();
}
