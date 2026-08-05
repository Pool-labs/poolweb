'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BellRing, CheckCircle2, HelpCircle, Loader2, Mail } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { observabilityApi } from '@/lib/admin/adminApi';
import { formatDateTime } from '@/lib/admin/format';
import {
  ALARM_STATE_COPY,
  ALARM_STATE_SEVERITY,
  ALERT_EMAIL_STATUS_COPY,
  ALERT_POLL_INTERVAL_MS,
  ALERT_SOURCE_COPY,
} from '@/lib/admin/observability';
import {
  AdminAlarmState,
  AdminAlertEmailStatus,
  ObservabilitySourceStatus,
  type AdminAlertState,
  type AdminAlertSummary,
} from '@/lib/admin/types';

/**
 * Alerting & notification status (PoolWeb half of poolmobile #190).
 *
 * The detail behind the layout-level banner: what each watched alarm is doing
 * right now, and whether an email would actually reach anybody.
 *
 * The honesty rules are #116's, one level down:
 *
 *  - **`unknown` is NOT `ok`.** An alarm CloudWatch did not return means
 *    nothing is watching that failure mode — which on production, whose
 *    Terraform has not been applied since #53, is a live possibility. It gets a
 *    warning tone and explicit "not reporting" copy, never a quiet green row.
 *  - **A failed or unconfigured READ never renders "all clear".** When
 *    `status !== ok` the alarm rows below say nothing about whether anything is
 *    on fire, and the panel says exactly that.
 *  - **A quiet inbox is always explained.** `email.status` is rendered with its
 *    reason, and `recipientCount === 0` is called out even when armed — an
 *    alerter with no recipients is silently useless.
 *
 * `stateReason` is rendered here and only here: it exists nowhere else in the
 * product (the alert email deliberately carries no upstream text), and it is
 * the one thing that answers "how far over threshold?". It is CloudWatch metric
 * math, so it carries counts rather than user data — and it is rendered as a
 * plain text child regardless, like every other upstream string on this surface.
 */
export function AlertsPanel() {
  const [state, setState] = useState<AdminAlertState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setState(await observabilityApi.alerts());
      setError(null);
    } catch (e) {
      // Keep the last good state on screen — an unreachable API is not evidence
      // that the alarms are fine, and blanking the panel would replace real
      // information with none.
      setError(e instanceof Error ? e.message : 'Could not read alerting state');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // Same cadence as the banner, and for the same reason: the alarms evaluate
    // on a 5-minute period, so polling faster cannot make the data fresher.
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, ALERT_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  if (loading && !state) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!state) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Could not read alerting state</AlertTitle>
        <AlertDescription className="text-xs">
          {error ?? 'Unknown error'} — nothing here says whether any alarm is firing.
        </AlertDescription>
      </Alert>
    );
  }

  const source = ALERT_SOURCE_COPY[state.status] ?? ALERT_SOURCE_COPY[ObservabilitySourceStatus.Unavailable];
  const emailCopy = ALERT_EMAIL_STATUS_COPY[state.email.status];
  const alarms = [...state.alarms].sort(
    (a, b) => ALARM_STATE_SEVERITY[a.state] - ALARM_STATE_SEVERITY[b.state],
  );
  const notReporting = alarms.filter((a) => a.state === AdminAlarmState.Unknown).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 pb-2">
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm">Alerting &amp; notification status</CardTitle>
        </div>
        <span className="text-xs text-muted-foreground">
          {state.criticalCount > 0
            ? `${state.criticalCount} firing`
            : source.trustworthy
              ? 'Nothing firing'
              : 'Unread'}
          {notReporting > 0 && ` · ${notReporting} not reporting`}
        </span>
      </CardHeader>

      <CardContent className="space-y-3 p-4 pt-2">
        {/* Whether we could read alarm state AT ALL comes first: everything
            below is meaningless if this failed. */}
        {!source.trustworthy && (
          <Alert
            variant={state.status === ObservabilitySourceStatus.Unavailable ? 'destructive' : 'default'}
            className={cn(
              state.status !== ObservabilitySourceStatus.Unavailable &&
                'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200',
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm">Alarm state not read</AlertTitle>
            <AlertDescription className="text-xs">
              {source.detail} <strong>Do not read the rows below as all-clear.</strong>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <p className="text-xs text-destructive">
            Last refresh failed ({error}). Showing the most recent successful read.
          </p>
        )}

        <div className="space-y-2">
          {alarms.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              The server reported no watched alarms.
            </p>
          ) : (
            alarms.map((alarm) => <AlarmRow key={alarm.key} alarm={alarm} />)
          )}
        </div>

        {/* The email half. Always rendered, including (especially) when it is
            not armed — a founder must never have to infer why no mail came. */}
        <div className="rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Alert email</span>
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide',
                emailCopy.tone === 'ok' &&
                  'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                emailCopy.tone === 'warning' &&
                  'border-amber-500/50 bg-amber-400/15 text-amber-700 dark:text-amber-400',
                emailCopy.tone === 'neutral' && 'border-border bg-muted text-muted-foreground',
              )}
            >
              {emailCopy.label}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {state.email.recipientCount} active admin
              {state.email.recipientCount === 1 ? '' : 's'} would be emailed
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{emailCopy.detail}</p>

          {/* Armed with nobody to tell is the failure that goes unnoticed until
              it matters, so it is called out even though nothing is "wrong". */}
          {state.email.status === AdminAlertEmailStatus.Sending &&
            state.email.recipientCount === 0 && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Alerting is armed but there are no active platform admins — no alert can reach
                anyone. Grant an admin on the Admins tab.
              </p>
            )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Environment <span className="font-mono">{state.environment}</span>
          {state.alarmPrefix && (
            <>
              {' · '}alarm prefix <span className="font-mono">{state.alarmPrefix}</span>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function AlarmRow({ alarm }: { alarm: AdminAlertSummary }) {
  const copy = ALARM_STATE_COPY[alarm.state] ?? ALARM_STATE_COPY[AdminAlarmState.Unknown];
  const Icon =
    copy.tone === 'ok' ? CheckCircle2 : copy.tone === 'danger' ? AlertTriangle : HelpCircle;

  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        copy.tone === 'danger' && 'border-destructive/50 bg-destructive/5',
        copy.tone === 'warning' && 'border-amber-500/40 bg-amber-400/5',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Icon
          className={cn(
            'h-4 w-4 shrink-0',
            copy.tone === 'ok' && 'text-emerald-600 dark:text-emerald-400',
            copy.tone === 'danger' && 'text-destructive',
            copy.tone === 'warning' && 'text-amber-600 dark:text-amber-400',
          )}
        />
        {/* Label and description are the SERVER's frozen copy — this dashboard
            deliberately carries no alarm map, so a newly watched alarm arrives
            correctly labelled with no web deploy. */}
        <span className="text-sm font-medium">{alarm.label}</span>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide',
            copy.tone === 'ok' &&
              'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
            copy.tone === 'danger' && 'border-destructive/50 bg-destructive/10 text-destructive',
            copy.tone === 'warning' &&
              'border-amber-500/50 bg-amber-400/15 text-amber-700 dark:text-amber-400',
          )}
        >
          {copy.label}
        </span>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">{alarm.name}</span>
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">{alarm.description}</p>
      <p className="mt-1 text-xs text-muted-foreground">{copy.detail}</p>

      {alarm.stateReason && (
        // CloudWatch's own metric-math reason. It exists ONLY in this payload —
        // the alert email carries no upstream text at all — so this is the only
        // place in the product that can answer "how far over threshold?".
        <p className="mt-1.5 break-words font-mono text-[11px] text-muted-foreground">
          {alarm.stateReason}
        </p>
      )}

      <div className="mt-1.5 flex flex-wrap gap-x-4 text-[11px] text-muted-foreground">
        <span>State changed: {formatDateTime(alarm.stateUpdatedAt)}</span>
        <span>
          Admins last emailed:{' '}
          {alarm.lastNotifiedAt ? formatDateTime(alarm.lastNotifiedAt) : 'never'}
        </span>
      </div>
    </div>
  );
}
