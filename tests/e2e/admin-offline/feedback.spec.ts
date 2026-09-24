import { expect, test, type Page, type Route } from '@playwright/test';

import { plantOfflineSession } from '../helpers/offlineAdmin';

/**
 * The Feedback tab (poolmobile #720), driven from fixtures.
 *
 * The API-backed half of this (a real row, a real audited status move) needs
 * the #720 server, which staging only has once it is deployed there — so the
 * page's own behaviour is pinned offline: user text is inert, status changes
 * are visible and in place, filters and the cursor reach the query string.
 */

const USER_ID = '00000000-0000-4000-8000-0000000000a1';
const XSS = '<img src=x onerror="window.__pwned=1">';

function row(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    userId: USER_ID,
    userDisplayName: 'Dana Reyes',
    userHandle: 'dana',
    area: 'SETTLE_UP',
    kind: 'BROKEN',
    status: 'NEW',
    text: 'The settle button did nothing.',
    context: {
      platform: 'ios',
      appVersion: '1.0.3',
      buildNumber: '42',
      updateId: '0f8e1c2a-7b9d-4e3f-a1b2-c3d4e5f60718',
      osVersion: '18.2',
      locale: 'en',
      screen: 'SettleUp',
    },
    createdAt: '2026-09-24T10:00:00.000Z',
    statusChangedAt: null,
    statusChangedById: null,
    ...over,
  };
}

interface Stubs {
  pages?: Record<string, { items: unknown[]; nextCursor: string | null }>;
  statusCode?: number;
  listQueries?: URLSearchParams[];
  statusBodies?: unknown[];
}

async function serveFeedback(page: Page, stubs: Stubs = {}): Promise<void> {
  const {
    pages = { first: { items: [row('f1', { text: XSS }), row('f2', { text: null })], nextCursor: null } },
    statusCode = 200,
    listQueries = [],
    statusBodies = [],
  } = stubs;

  await page.route('**/admin/api/**', async (route: Route) => {
    const url = new URL(route.request().url());
    const json = (status: number, data: unknown) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(
          status >= 400 ? { success: false, error: 'Fixture: write refused' } : { success: true, data },
        ),
      });

    if (url.pathname.endsWith('/feedback')) {
      listQueries.push(url.searchParams);
      const cursor = url.searchParams.get('cursor');
      const pageData = pages[cursor ?? 'first'] ?? { items: [], nextCursor: null };
      return json(200, { ...pageData, newCount: 5 });
    }
    const m = url.pathname.match(/\/feedback\/([^/]+)\/status$/);
    if (m && route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { status: string };
      statusBodies.push(body);
      return json(statusCode, row(m[1], { status: body.status, text: XSS }));
    }
    if (url.pathname.endsWith('observability/alerts')) {
      return json(200, { status: 'ok', criticalCount: 0, alarms: [], email: { status: 'ok', recipientCount: 1 } });
    }
    return route.abort('failed');
  });
}

test.beforeEach(async ({ context }) => {
  await plantOfflineSession(context);
});

test.describe('Feedback tab', () => {
  test('user text renders as literal text — the payload never becomes an element', async ({ page }) => {
    await serveFeedback(page);
    await page.goto('/admin/feedback');

    await expect(page.getByText(XSS)).toBeVisible();
    await expect(page.locator('[data-testid="feedback-row"] img')).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
    await expect(page.getByText('No text')).toBeVisible();
    await expect(page.getByText('5 new')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dana Reyes' }).first()).toHaveAttribute(
      'href',
      `/admin/users/${USER_ID}`,
    );
  });

  test('a status change is sent, shown, and applied in place', async ({ page }) => {
    const statusBodies: unknown[] = [];
    await serveFeedback(page, { statusBodies });
    await page.goto('/admin/feedback');

    const first = page.getByTestId('feedback-row').first();
    await first.getByRole('button', { name: 'Triaged' }).click();

    await expect(first.getByRole('status')).toHaveText('Marked Triaged');
    await expect(first.getByRole('button', { name: 'Triaged' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('4 new')).toBeVisible();
    expect(statusBodies).toEqual([{ status: 'TRIAGED' }]);
  });

  test('a refused status change says so on the row', async ({ page }) => {
    await serveFeedback(page, { statusCode: 404 });
    await page.goto('/admin/feedback');

    const first = page.getByTestId('feedback-row').first();
    await first.getByRole('button', { name: 'Fixed' }).click();

    await expect(first.getByRole('alert')).toContainText('Not saved');
    await expect(first.getByRole('button', { name: 'New' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('Load more sends the cursor and appends', async ({ page }) => {
    const listQueries: URLSearchParams[] = [];
    await serveFeedback(page, {
      listQueries,
      pages: {
        first: { items: [row('f1')], nextCursor: 'f1' },
        f1: { items: [row('f0', { text: 'Older one' })], nextCursor: null },
      },
    });
    await page.goto('/admin/feedback');

    await page.getByRole('button', { name: 'Load more' }).click();
    await expect(page.getByText('Older one')).toBeVisible();
    await expect(page.getByTestId('feedback-row')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0);
    expect(listQueries.at(-1)?.get('cursor')).toBe('f1');
  });

  test('a filter reaches the query string', async ({ page }) => {
    const listQueries: URLSearchParams[] = [];
    await serveFeedback(page, { listQueries });
    await page.goto('/admin/feedback');
    await expect(page.getByTestId('feedback-row').first()).toBeVisible();

    await page.getByRole('combobox', { name: 'Area filter' }).click();
    await page.getByRole('option', { name: 'Settle up' }).click();

    await expect.poll(() => listQueries.at(-1)?.get('area')).toBe('SETTLE_UP');
  });
});
