import fs from 'node:fs';

import { expect, request, test as setup } from '@playwright/test';

import {
  ADMIN_EMAIL,
  ADMIN_SKIP_FILE,
  ADMIN_STATE_FILE,
  ensureAuthDir,
  mailtrapCreds,
} from './helpers/env';
import { pollForOtp } from './helpers/otp';

/**
 * Log in to the admin dashboard ONCE and save the storage state every admin
 * spec reuses.
 *
 * The login is driven through the dashboard's OWN form — the same
 * `/admin/api/auth/send-otp` → Mailtrap → `/admin/api/auth/verify-otp` path a
 * founder takes — so the auth path is exercised, never weakened: no test-only
 * branch exists anywhere near verify-otp (its enumeration-safety property,
 * poolmobile #387, is load-bearing), and the code is read from the Mailtrap
 * capture inbox exactly the way a human reads it on staging today.
 *
 * A still-valid state file from a previous run is REUSED (probed with one
 * cheap read) rather than re-logging in: each OTP login mints a trusted-device
 * row server-side, so gratuitous logins are litter as well as latency.
 *
 * When Mailtrap credentials are absent and no reusable state exists, the setup
 * writes a skip reason and passes — the admin specs then skip with that
 * message instead of failing cryptically.
 */

const EMPTY_STATE = JSON.stringify({ cookies: [], origins: [] });

async function existingStateIsAlive(baseURL: string): Promise<boolean> {
  if (!fs.existsSync(ADMIN_STATE_FILE)) return false;
  const probe = await request.newContext({ baseURL, storageState: ADMIN_STATE_FILE });
  try {
    // Cheap, read-only, un-audited identity-gated endpoint.
    const res = await probe.get('/admin/api/app/requirements');
    return res.status() === 200;
  } catch {
    return false;
  } finally {
    await probe.dispose();
  }
}

setup('admin login (staging)', async ({ page, baseURL }) => {
  // The OTP poll alone may spend three minutes (every POP3 command is spaced
  // out under Mailtrap's rate limit) — give the whole login room beyond it.
  setup.setTimeout(240_000);
  ensureAuthDir();
  fs.rmSync(ADMIN_SKIP_FILE, { force: true });

  if (await existingStateIsAlive(baseURL!)) {
    return; // The saved session still authenticates — reuse it as-is.
  }

  const creds = mailtrapCreds();
  if (!creds) {
    fs.writeFileSync(ADMIN_STATE_FILE, EMPTY_STATE);
    fs.writeFileSync(
      ADMIN_SKIP_FILE,
      'Admin login skipped: MAILTRAP_POP3_USER / MAILTRAP_POP3_PASS are not set, so the ' +
        'OTP cannot be read from the staging capture inbox. Export them from AWS Secrets ' +
        'Manager (pool-staging/mailtrap-{user,pass}) — see tests/e2e/README.md.',
    );
    return;
  }

  await page.goto('/admin/login');

  // ⚠️ THE SAFETY GATE: refuse to log in — refuse to send even the OTP —
  // unless the server-resolved environment banner says STAGING. This suite
  // must never authenticate against production (#594's scope line).
  await expect(
    page.getByRole('region', { name: 'Current Pool environment: STAGING' }),
  ).toBeVisible();

  await page.getByLabel('Email').fill(ADMIN_EMAIL);

  // Captured IMMEDIATELY BEFORE triggering the send: the OTP is matched by
  // recipient + Date >= this moment, never by inbox position (Mailtrap's POP3
  // listing has no ordering contract — poolmobile #570's retraction).
  const sentAtMs = Date.now();
  await page.getByRole('button', { name: 'Send code' }).click();

  await expect(page.getByText(`Enter the 6-digit code sent to ${ADMIN_EMAIL}`)).toBeVisible();

  const code = await pollForOtp(creds, ADMIN_EMAIL, sentAtMs);

  // input-otp renders one real (visually transparent) input; six digits
  // auto-submit via the page's own onChange handler.
  await page.locator('input[autocomplete="one-time-code"], [data-input-otp]').first().fill(code);

  await page.waitForURL('**/admin/overview');
  await expect(
    page.getByRole('region', { name: 'Current Pool environment: STAGING' }),
  ).toBeVisible();

  await page.context().storageState({ path: ADMIN_STATE_FILE });
});
