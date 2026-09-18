import { expect, test, type Page, type Route } from '@playwright/test';

import { USERS_LIST, userRow } from '../fixtures/statsPayloads';
import { plantOfflineSession, serveAdminFixtures } from '../helpers/offlineAdmin';

/**
 * Creating a user and a pool from the dashboard (poolweb#46 over
 * poolmobile#684), driven from fixtures.
 *
 * ⚠️ THE ENDPOINTS DO NOT EXIST YET on any environment, so the most important
 * case here is the one that happens TODAY: a 404 must read as "the API has not
 * shipped this", not as a broken dashboard. That case is un-stageable against a
 * real environment, which is exactly what this project is for.
 *
 * The other two are the ones that will bite once it does ship: `isNewUser:
 * false` must never render as a creation, and the owner sent for a pool must be
 * the PICKED user rather than the acting admin.
 */

const REASON = 'Founder asked on a call; they could not receive the code.';

/** Pick a pool owner out of the shared `UserPicker` (single-select = "Choose"). */
async function pickOwner(page: Page, person: string): Promise<void> {
  const row = page.getByRole('listitem').filter({ hasText: person });
  await row.getByRole('button', { name: 'Choose' }).click();
}

/** Serve the list pages, and let each test decide what the POST does. */
async function serveLists(page: Page): Promise<void> {
  await serveAdminFixtures(page);
  await page.route('**/admin/api/users?*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: USERS_LIST }),
    });
  });
  await page.route('**/admin/api/pools?*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { pools: [], total: 0, limit: 25, offset: 0 } }),
    });
  });
}

/** Stub the create POST with a status + body, and record what was sent. */
async function stubCreate(
  page: Page,
  path: 'users' | 'pools',
  respond: { status: number; data?: unknown; error?: string },
  seen: unknown[],
): Promise<void> {
  await page.route(`**/admin/api/${path}`, async (route: Route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    seen.push(route.request().postDataJSON());
    await route.fulfill({
      status: respond.status,
      contentType: 'application/json',
      body: JSON.stringify(
        respond.status === 200
          ? { success: true, data: respond.data }
          : { success: false, error: respond.error ?? 'Not Found' },
      ),
    });
  });
}

test.beforeEach(async ({ context }) => {
  await plantOfflineSession(context);
});

test.describe('Create a user', () => {
  test('a 404 says the API has not shipped it — not that something broke', async ({ page }) => {
    const seen: unknown[] = [];
    await serveLists(page);
    await stubCreate(page, 'users', { status: 404 }, seen);

    await page.goto('/admin/users');
    await page.getByRole('button', { name: 'New user' }).click();

    await page.getByLabel('Email').fill('helpme@example.com');
    await page.getByLabel(/^Why/).fill(REASON);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText(/cannot create users yet/)).toBeVisible();
    await expect(page.getByText(/poolmobile#684/)).toBeVisible();
    // ⚠️ It absolves the typist and states that nothing was written — the two
    // things a founder needs before deciding whether to try again.
    await expect(page.getByText(/nothing you typed was wrong/)).toBeVisible();
    // The form is still filled in, so the attempt is not lost.
    await expect(page.getByLabel('Email')).toHaveValue('helpme@example.com');
  });

  test('an account that ALREADY EXISTED is never reported as created', async ({ page }) => {
    // ⚠️ `findOrCreateUserByEmail` is find-OR-create. Saying "created" here is
    // a lie a founder acts on — they stop looking for the account they needed.
    const seen: unknown[] = [];
    await serveLists(page);
    await stubCreate(
      page,
      'users',
      { status: 200, data: { user: userRow({ id: 'user-9' }), isNewUser: false } },
      seen,
    );

    await page.goto('/admin/users');
    await page.getByRole('button', { name: 'New user' }).click();
    await page.getByLabel('Email').fill('someone@example.com');
    await page.getByLabel(/^Why/).fill(REASON);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('This account already existed.')).toBeVisible();
    await expect(page.getByText(/Account created for/)).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^Open / })).toHaveAttribute(
      'href',
      '/admin/users/user-9',
    );
  });

  test('a real creation says so, and sends the typed email and reason', async ({ page }) => {
    const seen: unknown[] = [];
    await serveLists(page);
    await stubCreate(
      page,
      'users',
      { status: 200, data: { user: userRow({ id: 'user-new' }), isNewUser: true } },
      seen,
    );

    await page.goto('/admin/users');
    await page.getByRole('button', { name: 'New user' }).click();
    await page.getByLabel('Email').fill('  brand@new.example  ');
    await page.getByLabel(/^Why/).fill(`  ${REASON}  `);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText(/Account created for/)).toBeVisible();
    // Trimmed on the way out — a trailing space in an email is a support ticket.
    expect(seen).toEqual([{ email: 'brand@new.example', reason: REASON }]);
  });

  test('the form refuses to submit without a valid email and a real reason', async ({ page }) => {
    await serveLists(page);
    await page.goto('/admin/users');
    await page.getByRole('button', { name: 'New user' }).click();

    const submit = page.getByRole('button', { name: 'Create account' });
    await expect(submit).toBeDisabled();

    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel(/^Why/).fill(REASON);
    await expect(page.getByText(/does not look like an email/)).toBeVisible();
    await expect(submit).toBeDisabled();

    await page.getByLabel('Email').fill('fine@example.com');
    await expect(submit).toBeEnabled();

    // The reason is audited, so a token "x" is not a reason.
    await page.getByLabel(/^Why/).fill('x');
    await expect(submit).toBeDisabled();
  });

  test('it states what an admin-created account actually is', async ({ page }) => {
    // The three things the mental model "I made them an account" gets wrong.
    await serveLists(page);
    await page.goto('/admin/users');
    await page.getByRole('button', { name: 'New user' }).click();

    await expect(page.getByText(/They claim it with a login code/)).toBeVisible();
    await expect(page.getByText(/It starts un-activated/)).toBeVisible();
    await expect(page.getByText(/It does not let you in/)).toBeVisible();
  });
});

test.describe('Create a pool', () => {
  test('sends the PICKED owner, integer cents, and PRIVATE visibility', async ({ page }) => {
    const seen: unknown[] = [];
    await serveLists(page);
    await stubCreate(
      page,
      'pools',
      {
        status: 200,
        data: {
          pool: {
            id: 'pool-new',
            name: 'Thursday football',
            status: 'ACTIVE',
            visibility: 'PRIVATE',
            isSuspended: false,
            deletedAt: null,
            balanceCents: 0,
            memberCount: 1,
            creatorId: 'user-1',
            createdAt: '2026-09-18T12:00:00.000Z',
          },
        },
      },
      seen,
    );

    await page.goto('/admin/pools');
    await page.getByRole('button', { name: 'New pool' }).click();

    // The owner comes from the picker, never a default. The row's control is
    // labelled "Choose" in single-select mode; the row is found by the person.
    await pickOwner(page, 'Someone');
    await page.getByLabel('Pool name').fill('Thursday football');
    await page.getByLabel('Contribution per member').fill('25.50');
    await page.getByLabel(/^Why/).fill(REASON);

    // ⚠️ Money is INTEGER CENTS on the wire, parsed from the string — never
    // `parseFloat * 100`, which lands on 2549.9999999999995 for real inputs.
    await expect(page.getByText('$25.50')).toBeVisible();

    await page.getByRole('button', { name: 'Create pool' }).click();
    await expect(page.getByText(/created, owned by/)).toBeVisible();

    expect(seen).toEqual([
      {
        ownerUserId: 'user-1',
        name: 'Thursday football',
        type: 'custom',
        visibility: 'PRIVATE',
        contributionAmountCents: 2550,
        reason: REASON,
      },
    ]);
  });

  test('will not submit without an owner', async ({ page }) => {
    // An admin-owned pool is a support artefact nobody else can govern, so
    // there is deliberately no default owner to fall back to.
    await serveLists(page);
    await page.goto('/admin/pools');
    await page.getByRole('button', { name: 'New pool' }).click();

    await page.getByLabel('Pool name').fill('Ownerless');
    await page.getByLabel(/^Why/).fill(REASON);
    await expect(page.getByRole('button', { name: 'Create pool' })).toBeDisabled();
  });

  test('says why it is private, rather than offering a public pool that would 400', async ({
    page,
  }) => {
    await serveLists(page);
    await page.goto('/admin/pools');
    await page.getByRole('button', { name: 'New pool' }).click();

    await expect(page.getByText(/Created .*private/)).toBeVisible();
    await expect(page.getByText(/city chosen from the app/)).toBeVisible();
  });

  test('refuses an amount over the deposit ceiling', async ({ page }) => {
    await serveLists(page);
    await page.goto('/admin/pools');
    await page.getByRole('button', { name: 'New pool' }).click();

    await pickOwner(page, 'Someone');
    await page.getByLabel('Pool name').fill('Too much');
    await page.getByLabel(/^Why/).fill(REASON);
    await page.getByLabel('Contribution per member').fill('99999999');

    await expect(page.getByText(/Over the \$10,000\.00 limit/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create pool' })).toBeDisabled();
  });

  test('a gateway timeout does NOT claim nothing was created', async ({ page }) => {
    // ⚠️ The retry trap: a 504 may mean the pool exists. Telling the founder it
    // failed is how a duplicate gets made.
    const seen: unknown[] = [];
    await serveLists(page);
    await stubCreate(page, 'pools', { status: 504, error: 'Gateway Timeout' }, seen);

    await page.goto('/admin/pools');
    await page.getByRole('button', { name: 'New pool' }).click();
    await pickOwner(page, 'Someone');
    await page.getByLabel('Pool name').fill('Maybe made');
    await page.getByLabel(/^Why/).fill(REASON);
    await page.getByRole('button', { name: 'Create pool' }).click();

    await expect(page.getByText(/may still have created/)).toBeVisible();
    await expect(page.getByText(/Nothing was created/i)).toHaveCount(0);
  });
});
