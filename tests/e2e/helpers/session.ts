import { test } from '@playwright/test';

import { readAdminSkipReason } from './env';

/**
 * Skip every test in the calling admin spec when the setup project could not
 * establish a session (Mailtrap credentials absent and no reusable state).
 *
 * The skip reason is the one the setup wrote — a clear message, never a
 * cryptic locator timeout on the login page.
 */
export function skipWithoutAdminSession(): void {
  test.beforeEach(() => {
    const reason = readAdminSkipReason();
    test.skip(reason !== null, reason ?? undefined);
  });
}
