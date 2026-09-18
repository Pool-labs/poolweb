'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { humanizeEnum } from '@/lib/admin/format';
import { ALARM_STATE_COPY, ALARM_STATE_SEVERITY } from '@/lib/admin/observability';
import { cn } from '@/lib/utils';
import { AdminAlarmState, ObservabilitySourceStatus } from '@/lib/admin/types';
import type { StatsTabProps } from './types';

/**
 * Health — a compact strip that LINKS to Errors & Health rather than
 * duplicating it (#33's own wording, and #31's before it).
 *
 * ⚠️ THE HONESTY RULES ARE THE ERRORS TAB'S, NOT THIS PAGE'S. `Unknown` is NOT
 * ok — CloudWatch failing to return an alarm means nothing is watching that
 * failure mode — and a failed read never renders as "all clear". Repeating the
 * rule here rather than softening it is deliberate: this is the surface a
 * founder is most likely to be looking at when something breaks.
 *
 * Live, not windowed: "is anything on fire right now" has no range.
 */
export function HealthTab({ data }: StatsTabProps) {
  const state = data.alerts;
  const readable = state !== null && state.status === ObservabilitySourceStatus.Ok;
  const alarms = state
    ? [...state.alarms].sort((a, b) => ALARM_STATE_SEVERITY[a.state] - ALARM_STATE_SEVERITY[b.state])
    : [];
  const notReporting = alarms.filter((a) => a.state === AdminAlarmState.Unknown).length;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 p-4 pb-2">
        <div>
          <CardTitle className="text-sm">Alarms (#190)</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {!state
              ? 'Could not read alerting state — nothing here says whether any alarm is firing.'
              : !readable
                ? `Alerting read is ${humanizeEnum(state.status)} — the rows below do not say whether anything is on fire.`
                : state.criticalCount > 0
                  ? `${state.criticalCount} firing`
                  : notReporting > 0
                    ? `Nothing firing · ${notReporting} not reporting`
                    : 'Nothing firing'}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/errors">Open Errors &amp; Health</Link>
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {alarms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {state ? 'The server reported no watched alarms.' : 'No alarm data.'}
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {alarms.map((alarm) => {
              const copy = ALARM_STATE_COPY[alarm.state] ?? ALARM_STATE_COPY[AdminAlarmState.Unknown];
              const Icon =
                copy.tone === 'ok' ? CheckCircle2 : copy.tone === 'danger' ? AlertTriangle : HelpCircle;
              return (
                <div
                  key={alarm.key}
                  className={cn(
                    'flex items-start gap-2 rounded-lg border p-3 text-sm',
                    copy.tone === 'danger' && 'border-destructive/50 bg-destructive/5',
                    copy.tone === 'warning' && 'border-amber-500/40 bg-amber-400/5',
                  )}
                >
                  <Icon
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0',
                      copy.tone === 'ok' && 'text-green-600',
                      copy.tone === 'danger' && 'text-destructive',
                      copy.tone === 'warning' && 'text-amber-600',
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="font-medium">{alarm.label}</div>
                    <div className="text-xs text-muted-foreground">{copy.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
