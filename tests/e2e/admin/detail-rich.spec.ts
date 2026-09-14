import { expect, test, type Page } from '@playwright/test';

import { skipWithoutAdminSession } from '../helpers/session';

skipWithoutAdminSession();

/**
 * The WIDENED detail rendering (poolweb #31 Part 1 over poolmobile #618).
 *
 * No environment serves the #618 payload yet (staging until that PR deploys,
 * production until its first dispatch), so this spec takes the REAL detail
 * response from staging and widens it in-flight with the #618 contract exactly
 * as pinned on that issue — same field names, same shapes. It proves that the
 * day the server emits those fields the page renders them: country + region
 * derived from `locationCityKey`, the roster/membership cross-links, the
 * sensitive tier, and the staging-only card that must exist ONLY when a marker
 * is present.
 *
 * Read-only: the interception rewrites a GET's response body; nothing is sent.
 */

const USER_EXTRA = {
  locationCity: 'Columbia, MO, US',
  locationCityKey: 'columbia|mo|us',
  shareLocation: true,
  locationUpdatedAt: '2026-09-01T12:00:00.000Z',
  locationLat: 38.9517,
  locationLng: -92.3341,
  dateOfBirth: '2000-04-15T00:00:00.000Z',
  gender: 'FEMALE',
  occupation: 'STUDENT',
  occupationDetail: 'Nursing student',
  lifestyleStatus: 'STUDENT',
  lifestyleDetail: null,
  interests: ['SPORTS', 'FOOD_DRINK'],
  customInterests: ['pickleball'],
  bio: 'Here for the tailgates.',
  isDiscoverable: true,
  lastActivityAt: '2026-09-12T08:30:00.000Z',
  pointBalance: 140,
  lifetimePoints: 260,
  currentStreak: 3,
  longestStreak: 9,
  emailUndeliverableAt: null,
  hasPassword: true,
  identities: [{ provider: 'google', linkedAt: '2026-08-30T10:00:00.000Z' }],
  trustedDeviceCount: 2,
  pushTokenCount: 1,
  paymentHandles: { venmo: '@tester-e2e', cashapp: null, paypal: null, zelle: null, interac: null },
  preferredPaymentProvider: 'VENMO',
  pools: [
    {
      poolId: '00000000-0000-4000-8000-00000000e2e1',
      poolName: 'E2E Tailgate Fund',
      role: 'OWNER',
      joinedAt: '2026-08-20T10:00:00.000Z',
      poolStatus: 'ACTIVE',
      poolVisibility: 'PUBLIC',
    },
  ],
  seedCohort: 'college',
  demoMode: null,
};

const POOL_EXTRA = {
  locationCity: 'Toronto, ON, CA',
  locationCityKey: 'toronto|on|ca',
  showExactVenue: true,
  venueAddress: '1 Yonge St',
  locationLat: 43.6426,
  locationLng: -79.3871,
  category: 'Sports & Fitness',
  subcategory: 'Soccer',
  tags: ['SPORTS'],
  customTags: ['sunday-league'],
  rules: 'Members only. Bring your own boots.',
  shortDescription: 'Weekly five-a-side kitty.',
  contributionAmountCents: 2500,
  totalSpentCents: 12345,
  totalExpenses: 7,
  netAdjustmentsCents: -500,
  memberLimit: 12,
  memberLimitMin: 6,
  hideFromGlobalLeaderboards: false,
  lastActivityAt: '2026-09-10T18:00:00.000Z',
  members: [
    {
      userId: '00000000-0000-4000-8000-00000000e2e2',
      displayName: 'E2E Member',
      username: 'e2e_member',
      role: 'ADMIN',
      joinedAt: '2026-08-21T10:00:00.000Z',
    },
  ],
  seedCohort: null,
};

/** Widen the real `{ success, data: { <key>: … } }` envelope in flight. */
async function widen(page: Page, urlPattern: RegExp, key: 'user' | 'pool', extra: object) {
  await page.route(urlPattern, async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    body.data[key] = { ...body.data[key], ...extra };
    await route.fulfill({ response: res, json: body });
  });
}

test.describe('Detail pages — the widened #618 shape', () => {
  test('user page renders Location/Profile/Engagement/handles/memberships from the payload', async ({
    page,
  }) => {
    await widen(page, /\/admin\/api\/users\/[^/?]+$/, 'user', USER_EXTRA);

    await page.goto('/admin/users');
    await page.getByRole('link', { name: 'View', exact: true }).first().click();
    await page.waitForURL(/\/admin\/users\/[^/]+$/);

    // The widened shape: no "not reported" note anywhere.
    await expect(page.getByText(/not reported by this API version/)).toHaveCount(0);

    // Country + region + city from the KEY (#128/#469), coordinates as their own row.
    const location = page.getByText('Location', { exact: true }).locator('xpath=../..');
    await expect(location).toContainText('Columbia, MO, US');
    await expect(location).toContainText('United States');
    await expect(location).toContainText('MO');
    await expect(location).toContainText('38.95170, -92.33410');

    await expect(page.getByText('Nursing student')).toBeVisible();
    await expect(page.getByText('Here for the tailgates.')).toBeVisible();
    await expect(page.getByText('@tester-e2e')).toBeVisible();
    await expect(page.getByText('Google (Aug 30, 2026)')).toBeVisible();

    // Staging-only card renders because a marker is present…
    await expect(page.getByText('Staging context', { exact: true })).toBeVisible();
    await expect(page.getByText('Seed cohort: college')).toBeVisible();

    // …and the membership row links through to the pool page.
    await expect(
      page.getByRole('link', { name: 'E2E Tailgate Fund' }),
    ).toHaveAttribute('href', '/admin/pools/00000000-0000-4000-8000-00000000e2e1');
  });

  test('user page omits the staging card when no marker is present', async ({ page }) => {
    await widen(page, /\/admin\/api\/users\/[^/?]+$/, 'user', {
      ...USER_EXTRA,
      seedCohort: null,
      demoMode: null,
    });
    await page.goto('/admin/users');
    await page.getByRole('link', { name: 'View', exact: true }).first().click();
    await page.waitForURL(/\/admin\/users\/[^/]+$/);
    await expect(page.getByText('Location', { exact: true })).toBeVisible();
    await expect(page.getByText('Staging context', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Seed cohort:/)).toHaveCount(0);
  });

  test('pool page renders Location/About/Money/Members from the payload and links users', async ({
    page,
  }) => {
    await widen(page, /\/admin\/api\/pools\/[^/?]+$/, 'pool', POOL_EXTRA);

    await page.goto('/admin/pools');
    await page.getByRole('link', { name: 'View', exact: true }).first().click();
    await page.waitForURL(/\/admin\/pools\/[^/]+$/);

    await expect(page.getByText(/not reported by this API version/)).toHaveCount(0);

    const location = page.getByText('Location', { exact: true }).locator('xpath=../..');
    await expect(location).toContainText('Toronto, ON, CA');
    await expect(location).toContainText('Canada');
    await expect(location).toContainText('1 Yonge St');

    await expect(page.getByText('Sports & Fitness')).toBeVisible();
    await expect(page.getByText('Bring your own boots.')).toBeVisible();
    await expect(page.getByText('$25.00', { exact: true })).toBeVisible();
    await expect(page.getByText('-$5.00', { exact: true })).toBeVisible();
    await expect(page.getByText('6 – 12')).toBeVisible();

    await expect(page.getByRole('link', { name: 'E2E Member' })).toHaveAttribute(
      'href',
      '/admin/users/00000000-0000-4000-8000-00000000e2e2',
    );
    // No staging card without a marker.
    await expect(page.getByText(/Seed cohort:/)).toHaveCount(0);
  });
});
