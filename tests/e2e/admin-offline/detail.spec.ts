import { expect, test, type Page, type Route } from '@playwright/test';

import { POOL_DETAIL, USER_DETAIL, USER_DETAIL_NARROW } from '../fixtures/detailPayloads';
import { plantOfflineSession } from '../helpers/offlineAdmin';

/**
 * The widened detail pages (poolweb#31 Part 1 over poolmobile#618/#623),
 * served entirely from fixtures.
 *
 * ⚠️ WHY THIS EXISTS BESIDE `admin/detail-rich.spec.ts`. That spec proves the
 * same thing by widening a REAL staging response in flight — better evidence,
 * because it starts from what the server actually said, but it needs a staging
 * session. This one needs nothing, so poolweb#31's acceptance criteria 1–3 are
 * covered by something runnable even when the login path is broken (which it is
 * today — poolmobile#682).
 *
 * It does NOT close #31: that issue's outstanding item is seeing these sections
 * render against a live environment, and a fixture cannot answer it. What it
 * removes is the risk that the code was wrong all along.
 */

async function serveDetail(
  page: Page,
  { user, pool }: { user?: object; pool?: object } = {},
): Promise<void> {
  const json = (data: object) => JSON.stringify({ success: true, data });
  await page.route('**/admin/api/**', async (route: Route) => {
    const { pathname } = new URL(route.request().url());
    const fulfil = (data: object) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: json(data) });

    if (/\/admin\/api\/users\/[^/]+$/.test(pathname)) return fulfil({ user: user ?? USER_DETAIL });
    if (/\/admin\/api\/pools\/[^/]+$/.test(pathname)) return fulfil({ pool: pool ?? POOL_DETAIL });
    // The ledger tabs and the alert poller ride along on these pages.
    if (pathname.endsWith('/ledger')) {
      // `AdminPoolLedgerSummary` — the real field names matter: the page reads
      // `counts` and `memberBalances` directly, and an invented shape crashes
      // it rather than degrading (which is how this fixture was first wrong).
      return fulfil({
        poolId: POOL_DETAIL.id,
        poolName: POOL_DETAIL.name,
        status: POOL_DETAIL.status,
        cardBalanceCents: POOL_DETAIL.balanceCents,
        totalDepositedCents: 60_000,
        totalSpentCents: POOL_DETAIL.totalSpentCents,
        netAdjustmentsCents: POOL_DETAIL.netAdjustmentsCents,
        memberBalances: [],
        counts: { deposits: 3, transactions: 7, settlements: 1 },
      });
    }
    if (pathname.endsWith('observability/alerts')) {
      return fulfil({ status: 'ok', criticalCount: 0, alarms: [], email: { status: 'ok', recipientCount: 1 } });
    }
    // Anything unstubbed is aborted, never forwarded — this suite must not be
    // able to reach an environment.
    return route.abort('failed');
  });
}

test.beforeEach(async ({ context }) => {
  await plantOfflineSession(context);
});

test.describe('User detail — the widened shape (#31 AC 1–3)', () => {
  test('renders every section from the payload, with no "not reported" note', async ({ page }) => {
    await serveDetail(page);
    await page.goto(`/admin/users/${USER_DETAIL.id}`);

    await expect(page.getByText(/not reported by this API version/)).toHaveCount(0);

    for (const section of [
      'Identity',
      'Location',
      'Profile',
      'Engagement',
      'Payment handles',
      'Memberships',
    ]) {
      await expect(page.getByText(section, { exact: true }).first()).toBeVisible();
    }

    await expect(page.getByText('Nursing student')).toBeVisible();
    await expect(page.getByText('Here for the tailgates.')).toBeVisible();
    await expect(page.getByText('@tester-e2e')).toBeVisible();
  });

  test('country and region come from the KEY, and coordinates are their own row', async ({
    page,
  }) => {
    // ⚠️ #31 AC 3 exactly: `locationCityKey` answers "where", never the
    // coordinates — those are the sensitive tier and appear as a labelled row
    // of their own.
    await serveDetail(page);
    await page.goto(`/admin/users/${USER_DETAIL.id}`);

    const location = page.getByText('Location', { exact: true }).locator('xpath=../..');
    await expect(location).toContainText('Columbia, MO, US');
    await expect(location).toContainText('United States');
    await expect(location).toContainText('MO');
    await expect(location).toContainText('38.95170, -92.33410');
  });

  test('membership rows link through to the pool page (#31 AC 1)', async ({ page }) => {
    await serveDetail(page);
    await page.goto(`/admin/users/${USER_DETAIL.id}`);

    await expect(page.getByRole('link', { name: 'E2E Tailgate Fund' })).toHaveAttribute(
      'href',
      `/admin/pools/${POOL_DETAIL.id}`,
    );
  });

  test('the staging card appears only when a marker is present (#31 AC 4)', async ({ page }) => {
    await serveDetail(page);
    await page.goto(`/admin/users/${USER_DETAIL.id}`);
    await expect(page.getByText('Staging context', { exact: true })).toBeVisible();
    await expect(page.getByText('Seed cohort: college')).toBeVisible();

    // The same page, from a payload with no cohort and no demo mode: the card
    // must be ABSENT, so a production detail page carries no trace of staging.
    await serveDetail(page, { user: { ...USER_DETAIL, seedCohort: null, demoMode: null } });
    await page.goto(`/admin/users/${USER_DETAIL.id}`);
    await expect(page.getByText('Location', { exact: true })).toBeVisible();
    await expect(page.getByText('Staging context', { exact: true })).toHaveCount(0);
  });

  test('a pre-#618 payload says so ONCE per section, never a column of dashes', async ({ page }) => {
    // ⚠️ The #618 lesson in its original form: a narrow payload must read as
    // "this API version does not report that", not as a person with no profile.
    await serveDetail(page, { user: USER_DETAIL_NARROW });
    await page.goto(`/admin/users/${USER_DETAIL.id}`);

    await expect(page.getByText(/not reported by this API version/).first()).toBeVisible();
    // The identity fields it DOES serve still render.
    await expect(page.getByText('tester@example.com')).toBeVisible();
  });
});

test.describe('Pool detail — the widened shape (#31 AC 2–3)', () => {
  test('renders Location, About, Money and Members, and links members through', async ({
    page,
  }) => {
    await serveDetail(page);
    await page.goto(`/admin/pools/${POOL_DETAIL.id}`);

    await expect(page.getByText(/not reported by this API version/)).toHaveCount(0);

    const location = page.getByText('Location', { exact: true }).locator('xpath=../..');
    await expect(location).toContainText('Toronto, ON, CA');
    await expect(location).toContainText('Canada');
    await expect(location).toContainText('1 Yonge St');

    await expect(page.getByText('Sports & Fitness')).toBeVisible();
    await expect(page.getByText('Bring your own boots.')).toBeVisible();
    // Money is integer cents, formatted for display only.
    await expect(page.getByText('$25.00', { exact: true })).toBeVisible();
    await expect(page.getByText('-$5.00', { exact: true })).toBeVisible();

    await expect(page.getByRole('link', { name: 'E2E Member' })).toHaveAttribute(
      'href',
      '/admin/users/00000000-0000-4000-8000-00000000e2e2',
    );
  });
});
