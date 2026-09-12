import fs from 'node:fs';
import path from 'node:path';

import type { Pop3Credentials } from './pop3';

/**
 * Suite configuration — everything comes from the environment at runtime;
 * nothing here is ever a committed credential.
 *
 * Required for the login-gated (admin) specs:
 *   MAILTRAP_POP3_USER / MAILTRAP_POP3_PASS — the staging capture inbox's
 *   credentials (the same pair the server uses for SMTP). They live in AWS
 *   Secrets Manager as `pool-staging/mailtrap-{user,pass}` — see
 *   tests/e2e/README.md for the one-liner that exports them.
 *
 * Optional:
 *   E2E_ADMIN_EMAIL       — platform-admin account to log in as.
 *   MAILTRAP_POP3_HOST/PORT — default pop3.mailtrap.io:1100.
 */

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'yousef.langi@poolapp.co';

const AUTH_DIR = path.join(__dirname, '..', '.auth');
/** Storage state shared by every admin spec (gitignored). */
export const ADMIN_STATE_FILE = path.join(AUTH_DIR, 'admin-staging.json');
/** When login was impossible, the setup writes WHY here and admin specs skip. */
export const ADMIN_SKIP_FILE = path.join(AUTH_DIR, 'SKIP_ADMIN');

export function mailtrapCreds(): Pop3Credentials | null {
  const user = process.env.MAILTRAP_POP3_USER?.trim();
  const pass = process.env.MAILTRAP_POP3_PASS?.trim();
  if (!user || !pass) return null;
  return {
    host: process.env.MAILTRAP_POP3_HOST?.trim() || 'pop3.mailtrap.io',
    port: Number(process.env.MAILTRAP_POP3_PORT ?? 1100),
    user,
    pass,
  };
}

export function ensureAuthDir(): void {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

export function readAdminSkipReason(): string | null {
  try {
    return fs.readFileSync(ADMIN_SKIP_FILE, 'utf8').trim() || 'Admin session unavailable';
  } catch {
    return null;
  }
}
