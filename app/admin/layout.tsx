import { cookies } from 'next/headers';

import { ADMIN_ENV_COOKIE, type ApiEnv } from '@/lib/admin/adminEnv';
import { adminCookies } from '@/lib/admin/authCookies';
import { getAvailableApiEnvs, resolveApiEnv } from '@/lib/admin/serverApi';
import { AdminNav } from '@/components/admin/AdminNav';
import { CriticalAlertBanner } from '@/components/admin/CriticalAlertBanner';
import { EnvBanner } from '@/components/admin/EnvBanner';

/**
 * Admin shell (server component).
 *
 * Reads the httpOnly session cookies server-side. When a session exists for the
 * SELECTED environment the page is wrapped in the admin nav chrome; otherwise
 * (the login page — the only route middleware lets through without a cookie)
 * children render bare.
 *
 * The redirect-when-unauthenticated gate lives in `middleware.ts` (loop-safe,
 * runs before render). This layout only decides whether to paint the chrome —
 * it never holds a token in client JS.
 *
 * ⚠️ It also computes, per environment, WHETHER A SESSION EXISTS (#112) —
 * presence only, never a token — so the switcher can mark which environments
 * you are already signed into. That is the only cross-environment fact that
 * reaches the client, and it is deliberately the smallest possible one: a
 * boolean about yourself.
 *
 * The #190 critical-alert banner is mounted HERE rather than on a page, because
 * what it reports has nothing to do with which screen you are on: an alarm
 * firing while you read the Users table is exactly the case the Errors & Health
 * tab cannot cover. It sits INSIDE the session branch, so it never appears on
 * the login screen, and it needs no `env` prop — it rides the same env-aware
 * proxy as everything else and so always reports the environment the badge
 * names.
 *
 * ⚠️ THE ENVIRONMENT STRIP (#14) IS THE ONE THING RENDERED ON BOTH BRANCHES.
 * It is the first element on the page whether or not you are signed in, because
 * the login screen is exactly where being in the wrong environment is most
 * expensive and least visible: admin allowlists and OTP codes are
 * per-environment, so a code minted by staging can never verify against
 * production, and "the code didn't work" is otherwise indistinguishable from
 * "you are typing it into the wrong Pool". Resolving it HERE also means the
 * login screen states its environment on the FIRST paint, server-side, instead
 * of waiting on the client fetch #112 used.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  const env = resolveApiEnv(cookieStore.get(ADMIN_ENV_COOKIE)?.value);
  const availableEnvs = getAvailableApiEnvs();
  const hasSession = Boolean(cookieStore.get(adminCookies(env).accessToken)?.value);

  // Presence only, never a token — the smallest possible cross-environment fact
  // (a boolean about yourself), and the switcher needs it on the login screen
  // too so it can say which environments you are already signed into.
  const authenticatedEnvs = availableEnvs.filter((candidate: ApiEnv) =>
    Boolean(cookieStore.get(adminCookies(candidate).accessToken)?.value),
  );

  const envBanner = (
    <EnvBanner env={env} availableEnvs={availableEnvs} authenticatedEnvs={authenticatedEnvs} />
  );

  if (!hasSession) {
    return (
      <div className="min-h-screen bg-background">
        {envBanner}
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {envBanner}
      <CriticalAlertBanner />
      <AdminNav env={env} />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
