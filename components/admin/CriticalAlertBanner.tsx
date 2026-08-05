'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, MailX } from 'lucide-react';

import { cn } from '@/lib/utils';
import { observabilityApi } from '@/lib/admin/adminApi';
import { ALERT_POLL_INTERVAL_MS } from '@/lib/admin/observability';
import { AdminAlarmState, AdminAlertEmailStatus, type AdminAlertState } from '@/lib/admin/types';

/**
 * The production-critical alert banner (PoolWeb half of poolmobile #190).
 *
 * #116 shipped the observability read surfaces and everything still terminated
 * at a CloudWatch alarm in a console nobody was watching. #190's server half
 * added the SES dispatcher and this state; the banner is the half that reaches
 * a founder who happens to have the dashboard open, without them navigating to
 * a tab first.
 *
 * It is mounted in the admin LAYOUT, not on a page, precisely because the thing
 * it reports is not about the page you are on: an alarm firing while you read
 * the Users table is exactly the case the Errors tab cannot cover.
 *
 * Three behaviours worth knowing:
 *
 *  - **It follows the #112 environment toggle for free.** Every call rides the
 *    same-origin proxy, which resolves the selected environment server-side, so
 *    the banner always reports the environment the badge names. No env prop, no
 *    second source of truth to drift.
 *  - **A failed poll never clears a known-critical state.** Only a definitive
 *    successful read with `criticalCount === 0` takes the banner down (the
 *    house asymmetry: only a definitive answer may destroy state). A network
 *    blip must not make an ongoing incident disappear from the screen.
 *  - **Polling pauses while the tab is hidden** and re-reads immediately on
 *    return, so a backgrounded dashboard costs nothing and a returning founder
 *    never reads a stale banner.
 *
 * It renders NOTHING when nothing is in ALARM. Every other state this surface
 * can be in — not reporting, unreadable, email unarmed — is explained on the
 * Errors & Health tab rather than here: a banner that is always present is a
 * banner nobody sees.
 */
export function CriticalAlertBanner() {
  const pathname = usePathname();
  const [state, setState] = useState<AdminAlertState | null>(null);
  // Held in a ref rather than state: it must not re-render anything, and the
  // interval callback needs the live value, not the one from its closure.
  const mounted = useRef(true);

  const poll = useCallback(async () => {
    try {
      const next = await observabilityApi.alerts();
      if (mounted.current) setState(next);
    } catch {
      // Deliberately swallowed and deliberately NOT cleared. An unreachable
      // API is not evidence that the incident ended, and a banner that
      // flickers off on a dropped request is worse than one that lingers.
      // (A 401 is already handled inside `request()`, which bounces to login.)
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void poll();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void poll();
    }, ALERT_POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mounted.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [poll]);

  if (!state || state.criticalCount < 1) return null;

  const firing = state.alarms.filter((a) => a.state === AdminAlarmState.Alarm);
  const onErrorsTab = pathname.startsWith('/admin/errors');

  // An armed alerter with no recipients, or an alarm nobody will be emailed
  // about, is the failure mode that goes unnoticed until it matters — so the
  // banner says it at the moment it is provably true.
  const emailWarning =
    state.email.status !== AdminAlertEmailStatus.Sending
      ? 'No alert email will be sent for this — see the Errors & Health tab for why.'
      : state.email.recipientCount === 0
        ? 'Alert email is armed but there are no active platform admins to receive it.'
        : null;

  return (
    <div
      // `alert` rather than `status`: this is an interruption, and assistive
      // tech should announce it as one.
      role="alert"
      className={cn(
        'border-b-2 border-red-700 bg-red-600 text-white',
        // Matches the #112 PRODUCTION chrome deliberately — a founder who has
        // learned that "solid red across the top" means "this is the dangerous
        // one" reads this the same way without being taught twice.
      )}
    >
      <div className="container mx-auto flex flex-col gap-2 px-4 py-2.5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">
              {state.criticalCount === 1
                ? '1 production-critical alarm is firing'
                : `${state.criticalCount} production-critical alarms are firing`}
              <span className="ml-2 rounded bg-white/20 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                {state.environment}
              </span>
            </p>
            {/* The server freezes these labels, so this dashboard carries no
                alarm map and a newly watched alarm needs no web deploy. */}
            <p className="text-white/90">
              {firing.map((a) => a.label).join(' · ') || 'See the Errors & Health tab for detail.'}
            </p>
            {emailWarning && (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/90">
                <MailX className="h-3.5 w-3.5 shrink-0" />
                {emailWarning}
              </p>
            )}
          </div>
        </div>

        {!onErrorsTab && (
          <Link
            href="/admin/errors"
            className="shrink-0 self-start rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-red-700 transition-colors hover:bg-white/90 md:self-auto"
          >
            Open Errors &amp; Health
          </Link>
        )}
      </div>
    </div>
  );
}
