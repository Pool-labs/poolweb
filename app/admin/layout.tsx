import { cookies } from 'next/headers';

import { ADMIN_COOKIE } from '@/lib/admin/authCookies';
import { AdminNav } from '@/components/admin/AdminNav';

/**
 * Admin shell (server component).
 *
 * Reads the httpOnly session cookie server-side. When a session is present the
 * page is wrapped in the admin nav chrome; otherwise (the login page — the only
 * route middleware lets through without a cookie) children render bare.
 *
 * The redirect-when-unauthenticated gate lives in `middleware.ts` (loop-safe,
 * runs before render). This layout only decides whether to paint the chrome —
 * it never holds a token in client JS.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get(ADMIN_COOKIE.accessToken)?.value);

  if (!hasSession) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
