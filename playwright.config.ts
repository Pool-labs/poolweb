import { defineConfig } from '@playwright/test';

import { ADMIN_STATE_FILE } from './tests/e2e/helpers/env';

/**
 * Playwright harness for the admin dashboard + marketing site (poolmobile #594).
 *
 * The dashboard is served LOCALLY (`next start -p 3100`) with its env pointing
 * at STAGING — `POOL_API_BASE_URL` defaults to `https://api-staging.poolapp.co`
 * when unset, and the env switcher's default resolves the same way, so a fresh
 * session lands on staging with no configuration at all.
 *
 * ⚠️ STAGING ONLY. The login setup asserts the environment banner reads
 * STAGING before it sends a single OTP; nothing in this suite may ever be
 * pointed at api.poolapp.co. Several admin endpoints write (suspend, flags,
 * ledger adjustments, the #313 fleet-wide gate) — a scripted run against
 * production would drive them against real users.
 *
 * Run with `pnpm e2e` (builds first — `next start` needs a `.next`). See
 * tests/e2e/README.md for the Mailtrap credentials the login helper needs.
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Serial on purpose: the suite talks to a shared staging API with a
  // per-account rate budget, and the user-logs spec writes exactly one audit
  // row per run — parallel workers would multiply both.
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      // Logs in once (OTP over the dashboard's own form, code read from the
      // Mailtrap capture inbox) and saves the storage state every admin spec
      // reuses. When Mailtrap credentials are absent it records a skip reason
      // instead of failing cryptically.
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'admin',
      testMatch: /admin\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { storageState: ADMIN_STATE_FILE },
    },
    {
      // Public pages need no session — and no Mailtrap credentials.
      name: 'marketing',
      testMatch: /marketing\/.*\.spec\.ts/,
    },
  ],
  webServer: {
    // `next build` is NOT run here — playwright would rebuild on every
    // invocation. `pnpm e2e` chains the build; `pnpm e2e:test` assumes one.
    command: 'next start -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
