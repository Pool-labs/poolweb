'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Users,
  Layers,
  ClipboardList,
  HeartPulse,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  FlaskConical,
  LogOut,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { adminLogout } from '@/lib/admin/adminApi';
import { ENV_BADGE, ENV_DESCRIPTIONS, ENV_LABELS, type ApiEnv } from '@/lib/admin/adminEnv';

const NAV_ITEMS = [
  { href: '/admin/stats', label: 'Stats', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/pools', label: 'Pools', icon: Layers },
  // Moderation (#13, over poolmobile #158). Sits beside Users/Pools because it
  // is the same kind of work — governing accounts and content — and it is
  // available in EVERY environment: a report queue that only exists on staging
  // would not be the "demonstrable action on reports" a store review asks for.
  { href: '/admin/moderation', label: 'Moderation', icon: ShieldAlert },
  // Errors / Health (#192) — the read surface over #116. Available in EVERY
  // environment, unlike the QA console: knowing what is failing in production
  // is the whole point, and the API scopes the feed to its own log group, so
  // this page can only ever show the environment it is pointed at.
  { href: '/admin/errors', label: 'Errors', icon: HeartPulse },
  // Per-user logs (#14, over poolmobile #263). Sits NEXT TO Errors because the
  // two are the same surface at two zoom levels: Errors answers "is the platform
  // healthy", this answers "what happened to THIS person" — the question a
  // support message actually arrives as. Available in every environment, and
  // deliberately request-driven (nothing is fetched until a user is chosen).
  { href: '/admin/user-logs', label: 'User logs', icon: ScrollText },
  { href: '/admin/admins', label: 'Admins', icon: ShieldCheck },
  // App version (#590, over poolmobile #313) — the force-update gate's config.
  // Sits beside Admins because both are ops controls rather than day-to-day
  // work, and it is available in EVERY environment for the same reason Errors
  // is: the one that matters is production, and the gate that can strand a
  // whole fleet must not be reachable only by `curl` when it needs clearing.
  { href: '/admin/app-version', label: 'App version', icon: Smartphone },
] as const;

/**
 * Non-production-only entries. Hiding the link is a CONVENIENCE, never the
 * gate: `/admin/qa` 404s server-side when the SELECTED environment is
 * production, and the page itself re-checks with the API (`GET /qa/status` →
 * 404 = disabled).
 */
const NON_PROD_NAV_ITEMS = [{ href: '/admin/qa', label: 'QA', icon: FlaskConical }] as const;

/**
 * Production-only entries (#602). The Waitlist tab reads — and can delete —
 * live marketing-site signups straight from the ONE shared Firestore, which the
 * environment switcher does not touch. On any non-production environment the
 * banner above promises "test data only", and this tab would make that a lie —
 * so the link renders only where the banner and the data agree. As with QA,
 * hiding the link is a convenience: `/admin/dashboard` 404s server-side
 * whenever the selected environment is not production.
 */
const PROD_ONLY_NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Waitlist', icon: ClipboardList },
] as const;

/**
 * Admin nav chrome.
 *
 * ⚠️ ENVIRONMENT IDENTITY IS A SAFETY FEATURE (poolmobile #112). Before the
 * switcher existed, "which environment am I in" was decided once at deploy time
 * and a calm badge was enough. Now a single click moves between test data and
 * real users' money, so PRODUCTION tints this whole header and rules it in red —
 * the chrome changes, not just a pill.
 *
 * ⚠️ THE SWITCHER ITSELF NO LONGER LIVES HERE (#14). It moved to the
 * full-width `EnvBanner` above, which renders on every page INCLUDING login and
 * carries it under an explicit "Switch to" label. There is now exactly one
 * switcher in the dashboard; the badge kept here is an echo of the strip, so the
 * environment is still stated at the point of every action even after the strip
 * has scrolled away.
 *
 * Everything here is derived from the `env` the SERVER resolved (the layout
 * reads the httpOnly cookie); the client never decides which environment it is
 * in, it only renders it.
 */
export function AdminNav({ env }: { env: ApiEnv }) {
  const pathname = usePathname();
  const isProd = env === 'production';
  const items = isProd
    ? [...NAV_ITEMS, ...PROD_ONLY_NAV_ITEMS]
    : [...NAV_ITEMS, ...NON_PROD_NAV_ITEMS];

  return (
    <header
      className={cn(
        'border-b bg-card',
        // Unmistakable at a glance, from anywhere on the page.
        isProd && 'border-b-2 border-red-600 bg-red-500/5',
      )}
    >
      <div className="container mx-auto flex flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto">
          <span className="mr-2 font-bold">Pool Admin</span>
          <span
            title={`Insights are for the ${ENV_LABELS[env].toLowerCase()} environment — ${ENV_DESCRIPTIONS[env]}`}
            className={cn(
              'mr-2 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold tracking-wide',
              ENV_BADGE[env].className,
            )}
          >
            {ENV_LABELS[env]}
          </span>
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            // Scoped to the selected environment — the other session survives,
            // which is the whole point of separate sessions. Said out loud in
            // the label so nobody assumes "sign out" meant everywhere.
            title={`Ends the ${ENV_LABELS[env]} session only. Other environments stay signed in.`}
            onClick={() => void adminLogout()}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="mr-1 h-4 w-4" />
            Sign out of {ENV_LABELS[env]}
          </Button>
        </div>
      </div>
    </header>
  );
}
