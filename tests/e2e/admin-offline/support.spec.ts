import { expect, test, type Page, type Route } from '@playwright/test';

import { plantOfflineSession } from '../helpers/offlineAdmin';

/**
 * The Support tab (poolweb#45 over poolmobile#683), driven from fixtures.
 *
 * ⚠️ THE STATE THAT MATTERS MOST CANNOT BE STAGED ON A HEALTHY ENVIRONMENT.
 * `MESSAGING_ENABLED` defaults OFF and the API 404s all three routes when it
 * is — so "the queue is empty" and "nothing could be read" arrive at this page
 * as the same absence, and only one of them is good news. That distinction is
 * the page's whole job, and it is what these specs are mostly about.
 */

const THREAD_ID = '00000000-0000-4000-8000-00000000c0a1';
const PERSON_ID = '00000000-0000-4000-8000-0000000000u1';

const PERSON = { userId: PERSON_ID, displayName: 'Dana Reyes', avatarUrl: null };
const SUPPORT = { userId: 'support-1', displayName: 'Pool Support', avatarUrl: null };

function message(over: Record<string, unknown> = {}) {
  return {
    id: 'message-1',
    conversationId: THREAD_ID,
    senderId: PERSON_ID,
    body: 'My deposit did not show up.',
    createdAt: '2026-09-18T10:00:00.000Z',
    deletedAt: null,
    hiddenByBlock: false,
    ...over,
  };
}

const THREAD = {
  id: THREAD_ID,
  kind: 'DIRECT',
  poolId: null,
  poolName: null,
  title: null,
  createdById: PERSON_ID,
  requestState: 'NONE',
  requestedById: null,
  participants: [PERSON, SUPPORT],
  lastMessage: message(),
  lastMessageAt: '2026-09-18T10:00:00.000Z',
  unreadCount: 2,
  isMuted: false,
  createdAt: '2026-09-18T09:00:00.000Z',
  isSupport: true,
};

interface SupportStubs {
  /** Status for the thread LIST call. */
  listStatus?: number;
  threads?: unknown[];
  messages?: unknown[];
  replyStatus?: number;
  sent?: unknown[];
}

async function serveSupport(page: Page, stubs: SupportStubs = {}): Promise<void> {
  const {
    listStatus = 200,
    threads = [THREAD],
    messages = [message()],
    replyStatus = 201,
    sent = [],
  } = stubs;

  await page.route('**/admin/api/**', async (route: Route) => {
    const { pathname } = new URL(route.request().url());
    const json = (status: number, data: unknown) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(
          status >= 400 ? { success: false, error: 'Not Found' } : { success: true, data },
        ),
      });

    if (pathname.endsWith('/support/conversations')) {
      return json(listStatus, {
        items: threads,
        nextCursor: null,
        totalUnreadCount: 2,
        pendingRequestCount: 0,
      });
    }
    if (/\/support\/conversations\/[^/]+\/messages$/.test(pathname)) {
      if (route.request().method() === 'POST') {
        sent.push(route.request().postDataJSON());
        return json(replyStatus, { message: message({ id: 'new', senderId: 'support-1' }) });
      }
      return json(200, { items: messages, nextCursor: null });
    }
    if (pathname.endsWith('observability/alerts')) {
      return json(200, { status: 'ok', criticalCount: 0, alarms: [], email: { status: 'ok', recipientCount: 1 } });
    }
    return route.abort('failed');
  });
}

test.beforeEach(async ({ context }) => {
  await plantOfflineSession(context);
});

test.describe('Support tab', () => {
  test('a 404 is NEVER rendered as an empty queue', async ({ page }) => {
    // ⚠️ The whole point. Messaging off, or no support account yet — the API
    // deliberately answers identically — must not read as "nobody needs help".
    await serveSupport(page, { listStatus: 404 });
    await page.goto('/admin/support');

    await expect(page.getByText('Support threads are not readable here.')).toBeVisible();
    await expect(page.getByText(/MESSAGING_ENABLED/)).toBeVisible();
    await expect(page.getByText(/This is not .nobody needs help/)).toBeVisible();
    await expect(page.getByText(/No one has opened a support thread/)).toHaveCount(0);
  });

  test('an ANSWERED empty list does say nobody is waiting', async ({ page }) => {
    // The one case that really is good news, and the only one allowed to read
    // that way.
    await serveSupport(page, { threads: [] });
    await page.goto('/admin/support');

    await expect(page.getByText(/No one has opened a support thread/)).toBeVisible();
    await expect(page.getByText('Support threads are not readable here.')).toHaveCount(0);
  });

  test('a failed load says nothing about whether anyone is waiting', async ({ page }) => {
    await serveSupport(page, { listStatus: 503 });
    await page.goto('/admin/support');

    await expect(page.getByText('Could not load support threads.')).toBeVisible();
    await expect(page.getByText(/says whether anyone\s+is waiting/)).toBeVisible();
  });

  test('reads a thread and links to the asker, not to the support account', async ({ page }) => {
    await serveSupport(page);
    await page.goto('/admin/support');

    await expect(page.getByRole('heading', { name: 'Support' })).toBeVisible();
    await expect(page.getByText('My deposit did not show up.').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open their account' })).toHaveAttribute(
      'href',
      `/admin/users/${PERSON_ID}`,
    );
  });

  test('a REDACTED message shows its state, never a blank bubble', async ({ page }) => {
    // ⚠️ The server strips `body` for both of these before the row leaves the
    // API, so there is nothing to fall back to — and nothing that should be
    // shown. An empty bubble would read as a message that said nothing.
    await serveSupport(page, {
      messages: [
        message({ id: 'm1', body: '', deletedAt: '2026-09-18T11:00:00.000Z' }),
        message({ id: 'm2', body: '', hiddenByBlock: true }),
      ],
    });
    await page.goto('/admin/support');

    await expect(page.getByText('This message was removed.')).toBeVisible();
    await expect(page.getByText('This message is hidden by a block.')).toBeVisible();
  });

  test('the composer sends the typed body and says whose name is on it', async ({ page }) => {
    const sent: unknown[] = [];
    await serveSupport(page, { sent });
    await page.goto('/admin/support');

    // ⚠️ Stated rather than implied: the thread shows the SHARED account as
    // sender, and the audit row is what records the admin.
    await expect(page.getByText(/Your name is not on the message/)).toBeVisible();

    const send = page.getByRole('button', { name: 'Send reply' });
    await expect(send).toBeDisabled();

    await page.getByLabel('Reply as Pool Support').fill('  Looking into it now.  ');
    await expect(send).toBeEnabled();
    await send.click();

    await expect.poll(() => sent.length).toBe(1);
    // Trimmed on the way out.
    expect(sent[0]).toEqual({ body: 'Looking into it now.' });
  });

  test('a refused send says nothing was sent', async ({ page }) => {
    await serveSupport(page, { replyStatus: 404 });
    await page.goto('/admin/support');

    await page.getByLabel('Reply as Pool Support').fill('Hello?');
    await page.getByRole('button', { name: 'Send reply' }).click();

    await expect(page.getByText(/Nothing was sent/)).toBeVisible();
  });

  test('the nav carries Support beside Moderation', async ({ page }) => {
    await serveSupport(page);
    await page.goto('/admin/support');
    await expect(page.getByRole('link', { name: 'Support' })).toHaveAttribute(
      'href',
      '/admin/support',
    );
  });
});
