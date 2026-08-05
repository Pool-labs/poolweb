'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Users,
  Layers,
  ClipboardList,
  HeartPulse,
  ShieldCheck,
  FlaskConical,
  LogOut,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { adminLogout } from '@/lib/admin/adminApi';
import { ENV_BADGE, ENV_DESCRIPTIONS, ENV_LABELS, type ApiEnv } from '@/lib/admin/adminEnv';
import { EnvSwitcher } from './EnvSwitcher';

const NAV_ITEMS = [
  { href: '/admin/overview', label: 'Overview', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/pools', label: 'Pools', icon: Layers },
  // Errors / Health (#192) — the read surface over #116. Available in EVERY
  // environment, unlike the QA console: knowing what is failing in production
  // is the whole point, and the API scopes the feed to its own log group, so
  // this page can only ever show the environment it is pointed at.
  { href: '/admin/errors', label: 'Errors', icon: HeartPulse },
  { href: '/admin/admins', label: 'Admins', icon: ShieldCheck },
  { href: '/admin/dashboard', label: 'Waitlist', icon: ClipboardList },
] as const;

/**
 * Non-production-only entries. Hiding the link is a CONVENIENCE, never the
 * gate: `/admin/qa` 404s server-side when the SELECTED environment is
 * production, and the page itself re-checks with the API (`GET /qa/status` →
 * 404 = disabled).
 */
const NON_PROD_NAV_ITEMS = [{ href: '/admin/qa', label: 'QA', icon: FlaskConical }] as const;

/**
 * Admin nav chrome.
 *
 * ⚠️ THE BADGE IS THE SAFETY FEATURE (poolmobile #112). Before the environment
 * switcher existed, "which environment am I in" was decided once at deploy time
 * and a calm green PRODUCTION badge was enough. Now a single click moves between
 * test data and real users' money, so PRODUCTION renders as the loudest thing on
 * the page — solid red badge, a red header tint and a red rule under the whole
 * nav — and the entire chrome changes, not just a pill. Staging stays amber:
 * clearly "not production", never alarming.
 *
 * Everything here is derived from the `env` the SERVER resolved (the layout
 * reads the httpOnly cookie); the client never decides which environment it is
 * in, it only renders it.
 */
export function AdminNav({
  env,
  availableEnvs = [env],
  authenticatedEnvs = [env],
}: {
  env: ApiEnv;
  availableEnvs?: ApiEnv[];
  authenticatedEnvs?: ApiEnv[];
}) {
  const pathname = usePathname();
  const isProd = env === 'production';
  const items = isProd ? NAV_ITEMS : [...NAV_ITEMS, ...NON_PROD_NAV_ITEMS];

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
          <EnvSwitcher
            env={env}
            availableEnvs={availableEnvs}
            authenticatedEnvs={authenticatedEnvs}
          />
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
