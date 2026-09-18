import { expect, test } from '@playwright/test';

import { LEGACY_POOLS, LEGACY_SIGNUPS, STATS_ROUTES } from '../fixtures/statsPayloads';
import { plantOfflineSession, serveAdminFixtures } from '../helpers/offlineAdmin';

/**
 * Stats, driven from fixtures (poolweb #33).
 *
 * The API-backed `admin/stats.spec.ts` proves the page works against the real
 * staging API. This one proves the three things live data cannot:
 *
 *   1. the delta ARITHMETIC — known inputs, a checkable rendered percentage;
 *   2. a panel whose call FAILED says so, and never renders as "no data";
 *   3. a payload from an API older than #624 degrades PER PANEL — the page
 *      still renders, and each panel that lost its source says which.
 *
 * Nothing here touches an environment (see `helpers/offlineAdmin.ts`).
 */

test.beforeEach(async ({ context }) => {
  await plantOfflineSession(context);
});

test.describe('Stats (fixtures)', () => {
  test('renders the delta the arithmetic actually produces', async ({ page }) => {
    await serveAdminFixtures(page);
    await page.goto('/admin/stats');

    await expect(page.getByRole('heading', { name: 'Stats', level: 1 })).toBeVisible();

    // 25 signups this window against 20 in the one before: +5, i.e. +25%.
    const signupTile = page.getByText('Signups (last 30d)', { exact: true }).locator('xpath=../..');
    await expect(signupTile).toContainText('25');
    await expect(signupTile).toContainText('+25% (+5)');
    await expect(signupTile).toContainText('▲');
    await expect(signupTile).toContainText('vs the 30 days before');

    // A fall renders as a fall: 40 transactions against 50 before.
    await page.getByRole('tab', { name: 'Money' }).click();
    const txTile = page.getByText('Transactions (last 30d)', { exact: true }).locator('xpath=../..');
    await expect(txTile).toContainText('−20% (−10)');
    await expect(txTile).toContainText('▼');

    // ⚠️ An unchanged figure says so in words. "0%" reads as a broken metric.
    await page.getByRole('tab', { name: 'Pools' }).click();
    const newPoolsTile = page.getByText('New pools (last 30d)', { exact: true }).locator('xpath=../..');
    await expect(newPoolsTile).toContainText('No change');
  });

  test('a panel whose call failed says so — it never reads as "no data"', async ({ page }) => {
    await serveAdminFixtures(page, { fail: ['metrics/pools'] });
    await page.goto('/admin/stats');

    // The page survives: Growth still has its numbers.
    await expect(page.getByText('Signups per day')).toBeVisible();

    await page.getByRole('tab', { name: 'Pools' }).click();
    // The tile degrades to `—`, which is NOT `0`.
    const totalTile = page.getByText('Total pools', { exact: true }).locator('xpath=../..');
    await expect(totalTile).toContainText('—');
    await expect(totalTile).not.toContainText('0');

    // And the charts say the source is untrustworthy, in those words.
    await expect(page.getByText(/Could not load this panel/).first()).toBeVisible();
    await expect(page.getByText('No data in this window.')).toHaveCount(0);
  });

  test('every metrics call failing is the one case that takes the whole page', async ({ page }) => {
    // ⚠️ DERIVED, not a hand-written list. Twice now a new metrics call was
    // added to the page and this list was not updated, so "every call failed"
    // quietly stopped meaning that and the spec passed for the wrong reason.
    // Every stubbed route EXCEPT the alerts read is a metrics call — that is
    // the page's own rule: alerts never decide its fate.
    await serveAdminFixtures(page, {
      fail: Object.keys(STATS_ROUTES).filter((path) => path !== 'observability/alerts'),
    });
    await page.goto('/admin/stats');

    await expect(page.getByText('Could not load metrics')).toBeVisible();
  });

  test('an API older than #624 degrades per panel, not per page', async ({ page }) => {
    // ⚠️ The #618 lesson, applied to #624: the env switch can point this page
    // at an API that never heard of these fields. The figures it DOES serve
    // must still render, and the rest must say they were not reported —
    // never a column of dashes implying the platform has no pools.
    await serveAdminFixtures(page, {
      overrides: { 'metrics/pools': LEGACY_POOLS, 'metrics/signups': LEGACY_SIGNUPS },
    });
    await page.goto('/admin/stats');

    // Present on both API versions: the figure renders, with NO delta beside it.
    const signupTile = page.getByText('Signups (last 30d)', { exact: true }).locator('xpath=../..');
    await expect(signupTile).toContainText('25');
    await expect(signupTile).not.toContainText('vs the 30 days before');

    await page.getByRole('tab', { name: 'Pools' }).click();
    await expect(page.getByText('Total pools', { exact: true }).locator('xpath=../..')).toContainText(
      '33',
    );
    // The #624-only panels name what this API version does not report.
    await expect(page.getByText(/does not report pool categories/)).toBeVisible();
    await expect(page.getByText(/does not report the size distribution/)).toBeVisible();
  });

  test('the last by-decision panel explains itself', async ({ page }) => {
    await serveAdminFixtures(page);
    await page.goto('/admin/stats');

    await page.getByRole('tab', { name: 'Activity' }).click();
    await expect(page.getByText(/poolmobile#648/)).toBeVisible();
    await expect(page.getByText('The API does not serve this yet.').first()).toBeVisible();

    // ⚠️ poolmobile#647 SHIPPED, so the Money tab's volume panel is no longer
    // one of these. Its old "deliberately not served" copy must be GONE — a
    // panel that still refuses to show a figure the API now returns is worse
    // than one that never had it, because nobody goes looking.
    await page.getByRole('tab', { name: 'Money' }).click();
    await expect(page.getByText(/deliberately not served/)).toHaveCount(0);
  });

  test('money volume renders as DOLLARS, never as raw cents', async ({ page }) => {
    // ⚠️ THE FAILURE THIS EXISTS FOR IS SILENT AND PLAUSIBLE. Every figure on
    // the wire is integer cents; rendered unformatted, $42,100.00 reads as
    // "4210000" — a number that looks like a perfectly good answer and is
    // wrong by a factor of 100. The fixture's amounts are chosen so the two
    // cannot be confused.
    await serveAdminFixtures(page);
    await page.goto('/admin/stats');
    await page.getByRole('tab', { name: 'Money' }).click();

    const deposited = page.getByText('Deposited (last 30d)', { exact: true }).locator('xpath=../..');
    await expect(deposited).toContainText('$42,100.00');
    await expect(deposited).not.toContainText('4210000');
    // 4,210,000 against 5,262,500 before — a fall of exactly 20%.
    // ⚠️ The ABSOLUTE half of the delta is money too. This first ran with the
    // raw cents there — "−1,052,500" under a tile reading "$42,100.00", one
    // change stated twice in two units — which is exactly the mistake the
    // percentage alone cannot show you.
    await expect(deposited).toContainText('−20% (−$10,525.00)');
    await expect(deposited).toContainText('▼');

    const spent = page.getByText('Spent (last 30d)', { exact: true }).locator('xpath=../..');
    await expect(spent).toContainText('$13,375.00');

    // Deposited − spent, computed on CENTS and formatted once.
    const net = page.getByText('Net movement (last 30d)', { exact: true }).locator('xpath=../..');
    await expect(net).toContainText('$28,725.00');

    // A NEGATIVE net adjustment keeps its sign — a debit is not a credit.
    const adjustments = page
      .getByText('Net adjustments (all time)', { exact: true })
      .locator('xpath=../..');
    await expect(adjustments).toContainText('-$25.00');
  });

  test('a dead money call greys ONE panel and never reads as zero', async ({ page }) => {
    // ⚠️ `—` and `$0.00` are different claims and the #116 rule is that they
    // must look different. "No money moved" is a headline; "we could not read
    // it" is a bug — and on a money panel the wrong one is very expensive.
    await serveAdminFixtures(page, { fail: ['metrics/money'] });
    await page.goto('/admin/stats');
    await page.getByRole('tab', { name: 'Money' }).click();

    const deposited = page.getByText('Deposited (last 30d)', { exact: true }).locator('xpath=../..');
    await expect(deposited).toContainText('—');
    await expect(deposited).not.toContainText('$0.00');

    // The panels fed by the OTHER call are untouched — failure is per panel.
    const tx = page.getByText('Transactions (last 30d)', { exact: true }).locator('xpath=../..');
    await expect(tx).toContainText('40');

    await expect(page.getByText(/did not answer for this environment/).first()).toBeVisible();
  });

  test('switching the range keeps you on the tab you were reading', async ({ page }) => {
    // ⚠️ The regression this exists for: `<Tabs>` lives inside the loading
    // ternary, so a reload unmounts it. Uncontrolled, that threw the reader
    // back to Growth on every range change — maddening precisely when someone
    // is comparing two windows on one tab.
    await serveAdminFixtures(page);
    await page.goto('/admin/stats');

    await page.getByRole('tab', { name: 'Money' }).click();
    await expect(page.getByRole('region', { name: 'Money' })).toBeVisible();

    await page.getByRole('combobox', { name: 'Date range' }).click();
    await page.getByRole('option', { name: 'Last 7 days' }).click();

    await expect(page.getByRole('region', { name: 'Money' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Money' })).toContainText('Last 7 days');
    await expect(page.getByRole('region', { name: 'Growth' })).toHaveCount(0);
  });

  test('a status gets its semantic colour, not a positional one', async ({ page }) => {
    // ⚠️ The wire values are Prisma's (COMPLETED/PENDING/DECLINED), NOT the
    // lowercase enum the shared package also exports. Keying the palette on the
    // wrong one is silent — every slice just misses its colour — so the legend
    // swatches are asserted against the palette roles here.
    await serveAdminFixtures(page);
    await page.goto('/admin/stats');
    await page.getByRole('tab', { name: 'Money' }).click();

    const donut = page.getByText('Transactions by status').locator('xpath=../../..');
    const swatch = (label: string) =>
      donut.locator('li', { hasText: label }).locator('span').first();

    await expect(swatch('Completed')).toHaveCSS('background-color', 'rgb(12, 163, 12)');
    await expect(swatch('Declined')).toHaveCSS('background-color', 'rgb(208, 59, 59)');
    await expect(swatch('Pending')).toHaveCSS('background-color', 'rgb(250, 178, 25)');
  });

  test('an all-time panel with nothing in it does not blame the window', async ({ page }) => {
    // On the freshly reset production database every all-time donut is empty.
    // "No data in this window" would tell a founder the RANGE is empty when the
    // fact is the platform is.
    await serveAdminFixtures(page, {
      overrides: {
        'metrics/transactions': {
          total: 0,
          byStatus: { COMPLETED: 0, PENDING: 0, DECLINED: 0, APPROVED: 0 },
          series: [],
          window: { days: 30, since: '2026-08-19T00:00:00.000Z' },
          totalInWindow: 0,
          settlementsByStatus: { CONFIRMED: 0, PENDING: 0, REJECTED: 0 },
          settlementsInWindow: 0,
          depositsInWindow: 0,
        },
      },
    });
    await page.goto('/admin/stats');
    await page.getByRole('tab', { name: 'Money' }).click();

    // Scoped to the ALL-TIME cards. The windowed trend chart on the same tab
    // says "No data in this window", and that is correct there — the point is
    // that the two say DIFFERENT things, not that one phrase disappears.
    for (const title of ['Settlements by status', 'Transactions by status']) {
      const card = page.getByText(title, { exact: true }).locator('xpath=../../..');
      await expect(card).toContainText('Nothing recorded yet.');
      await expect(card).not.toContainText('No data in this window.');
    }
    const windowed = page.getByText('Transactions per day', { exact: true }).locator('xpath=../../..');
    await expect(windowed).toContainText('No data in this window.');
  });

  test('the leaderboard headline names the pool, the unit, and an EMPTY board', async ({
    page,
  }) => {
    await serveAdminFixtures(page);
    await page.goto('/admin/stats');
    await page.getByRole('tab', { name: 'Engagement' }).click();

    const panel = page.getByText('Leaderboard headline').locator('xpath=../../..');

    // The pool links through, and the value carries its NOUN — `value` counts
    // expenses on one board and DAYS on another, so a bare number would be
    // read as the wrong thing.
    await expect(panel.getByRole('link', { name: 'Thursday football' })).toHaveAttribute(
      'href',
      '/admin/pools/pool-1',
    );
    await expect(panel).toContainText('42 expenses');
    await expect(panel).toContainText('12 members');

    // ⚠️ An empty board says so, and is NOT rendered as a zero.
    await expect(panel).toContainText('No pool qualifies yet');
    await expect(panel).not.toContainText('0 days');

    // The board period is stated, because it is not the range control's axis.
    await expect(panel).toContainText('month boards');
  });

  test('a failed leaderboards call degrades that panel alone', async ({ page }) => {
    await serveAdminFixtures(page, { fail: ['metrics/leaderboards'] });
    await page.goto('/admin/stats');
    await page.getByRole('tab', { name: 'Engagement' }).click();

    await expect(page.getByText(/leaderboards metric did not answer/)).toBeVisible();
    // The rest of the tab still has its numbers.
    await expect(page.getByText('Points awarded by earning rule')).toBeVisible();
  });

  test('stickiness is unanswerable, not 0%, with no monthly base', async ({ page }) => {
    await serveAdminFixtures(page, {
      overrides: {
        'metrics/active-users': {
          asOf: '2026-09-18T08:00:00.000Z',
          dau: 0,
          wau: 0,
          mau: 0,
          lastSeenDistribution: [],
        },
      },
    });
    await page.goto('/admin/stats');
    await page.getByRole('tab', { name: 'Activity' }).click();

    const tile = page.getByText('Stickiness (DAU/MAU)', { exact: true }).locator('xpath=../..');
    await expect(tile).toContainText('—');
    await expect(tile).toContainText('No monthly-active base to divide by');
  });
});
