'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Menu,
  X,
  Users,
  Layers,
  ClipboardList,
  HeartPulse,
  ScrollText,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  FlaskConical,
  LogOut,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { adminLogout } from '@/lib/admin/adminApi';
import { ENV_LABELS, type ApiEnv } from '@/lib/admin/adminEnv';

const NAV_ITEMS = [
  { href: '/admin/stats', label: 'Stats', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/pools', label: 'Pools', icon: Layers },
  // Moderation (#13, over poolmobile #158). Sits beside Users/Pools because it
  // is the same kind of work — governing accounts and content — and it is
  // available in EVERY environment: a report queue that only exists on staging
  // would not be the "demonstrable action on reports" a store review asks for.
  { href: '/admin/moderation', label: 'Moderation', icon: ShieldAlert },
  // Support (#45, over poolmobile#683). Sits beside Moderation because it is
  // the same kind of work — a queue of people waiting on us — and it is
  // available in EVERY environment for the same reason: the one that matters
  // is production. It renders its own explanation when messaging is off.
  { href: '/admin/support', label: 'Support', icon: MessageSquare },
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

/** Ties the hamburger's `aria-controls` to the panel it opens. */
const MOBILE_MENU_ID = 'admin-mobile-menu';

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
 * ⚠️ NEITHER THE SWITCHER NOR THE BADGE LIVES HERE ANY MORE. The switcher moved
 * to the full-width `EnvBanner` above (#14); the wordmark-plus-badge went with
 * it on 2026-09-18, because it was saying a second time what the banner already
 * says better. The banner leads with "You are on STAGING", explains what that
 * MEANS, and carries the switcher — three lines above a pill reading "Staging".
 *
 * ⚠️ AND THE ARGUMENT FOR KEEPING THE BADGE DID NOT SURVIVE CHECKING. It was
 * "the environment is still stated at the point of every action even after the
 * strip has scrolled away" — but neither this header nor the banner is `sticky`
 * or `fixed`, so they scroll away together, a few pixels apart. The badge was
 * never visible in a moment the banner was not.
 *
 * ⚠️ WHAT DOES STAY IS THE PRODUCTION TINT, and it is not decoration. A red
 * rule and a red wash on the whole bar is an ambient signal you cannot read
 * past — it does not compete for attention with the nav labels the way a pill
 * does, and it is the one part of this header that says "real users, real
 * money" without anybody having to look at it.
 *
 * Everything here is derived from the `env` the SERVER resolved (the layout
 * reads the httpOnly cookie); the client never decides which environment it is
 * in, it only renders it.
 */
export function AdminNav({ env }: { env: ApiEnv }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const isProd = env === 'production';
  const items = isProd
    ? [...NAV_ITEMS, ...PROD_ONLY_NAV_ITEMS]
    : [...NAV_ITEMS, ...NON_PROD_NAV_ITEMS];

  // Close on navigation. ⚠️ Keyed on `pathname`, not on the link's onClick:
  // the QA console and the env switcher both navigate programmatically, and a
  // menu still open over the page they landed on is the thing that makes a
  // hamburger feel broken.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape and an outside click, the two dismissals a disclosure has to have.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  return (
    <header
      className={cn(
        'border-b bg-card',
        // Unmistakable at a glance, from anywhere on the page.
        isProd && 'border-b-2 border-red-600 bg-red-500/5',
      )}
    >
      <div ref={panelRef} className="container mx-auto px-4 py-3">
        {/* ── Phone: just the menu ─────────────────────────────────────────
            The environment is stated in full by the `EnvBanner` directly above
            this bar, on every page including login — so there is nothing left
            here to say, and a bar carrying one control does not need a label
            explaining that it is a bar. */}
        <div className="flex items-center justify-end gap-2 lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={open ? 'Close menu' : 'Menu'}
            aria-expanded={open}
            aria-controls={MOBILE_MENU_ID}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {open && (
          <nav
            id={MOBILE_MENU_ID}
            aria-label="Admin"
            className="mt-2 flex flex-col gap-1 border-t pt-2 lg:hidden"
          >
            {items.map((item) => (
              <NavItemLink
                key={item.href}
                item={item}
                pathname={pathname}
                className="w-full"
              />
            ))}
            <SignOutButton env={env} className="mt-1 justify-start" />
          </nav>
        )}

        {/* ── Desktop: the single row, unchanged ───────────────────────── */}
        <div className="hidden lg:flex lg:items-center lg:justify-between lg:gap-2">
          <div className="flex items-center gap-1">
            {items.map((item) => (
              <NavItemLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
          <SignOutButton env={env} />
        </div>
      </div>
    </header>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

/** One destination. Same active rule in both layouts, so they cannot disagree. */
function NavItemLink({
  item: { href, label, icon: Icon },
  pathname,
  className,
}: {
  item: NavItem;
  pathname: string;
  className?: string;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors lg:py-1.5',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

/**
 * Sign out — and the ONE place on this bar that still names the environment.
 *
 * ⚠️ Deliberately kept when the wordmark's badge went (2026-09-18). Sessions
 * are per-environment (#112), so "Sign out" alone would be ambiguous about
 * which one it ends — and this is the single control here with a consequence
 * that differs by environment. Every other label on the bar is a destination,
 * where the environment is already stated by the banner above.
 */
function SignOutButton({ env, className }: { env: ApiEnv; className?: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      // Scoped to the selected environment — the other session survives, which
      // is the whole point of separate sessions. Said out loud in the label so
      // nobody assumes "sign out" meant everywhere.
      title={`Ends the ${ENV_LABELS[env]} session only. Other environments stay signed in.`}
      onClick={() => void adminLogout()}
      className={cn('text-muted-foreground hover:text-destructive', className)}
    >
      <LogOut className="mr-1 h-4 w-4" />
      Sign out of {ENV_LABELS[env]}
    </Button>
  );
}
