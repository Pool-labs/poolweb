'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Users, Layers, ClipboardList, ShieldCheck, LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { adminLogout } from '@/lib/admin/adminApi';
import type { ApiEnv } from '@/lib/admin/serverApi';

/**
 * Environment badge — makes it unmistakable WHICH environment's data the
 * dashboard is showing, so staging insights are never read as production.
 * Staging is loud (amber) as a "not production" signal.
 */
const ENV_BADGE: Record<ApiEnv, { label: string; className: string }> = {
  production: {
    label: 'PRODUCTION',
    className:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  },
  staging: {
    label: 'STAGING',
    className:
      'bg-amber-400/20 text-amber-700 dark:text-amber-400 border-amber-400/50',
  },
  local: {
    label: 'LOCAL',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

const NAV_ITEMS = [
  { href: '/admin/overview', label: 'Overview', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/pools', label: 'Pools', icon: Layers },
  { href: '/admin/admins', label: 'Admins', icon: ShieldCheck },
  { href: '/admin/dashboard', label: 'Waitlist', icon: ClipboardList },
] as const;

export function AdminNav({ env }: { env: ApiEnv }) {
  const pathname = usePathname();
  const badge = ENV_BADGE[env];

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto">
          <span className="mr-2 font-bold">Pool Admin</span>
          <span
            title={`Insights are for the ${badge.label.toLowerCase()} environment`}
            className={cn(
              'mr-2 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold tracking-wide',
              badge.className,
            )}
          >
            {badge.label}
          </span>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void adminLogout()}
          className="self-end text-muted-foreground hover:text-destructive sm:self-auto"
        >
          <LogOut className="mr-1 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
