'use client';

import { AlertTriangle, CheckCircle2, HelpCircle, Loader2, XCircle } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { deriveHealth, HealthLevel, type HealthFinding } from '@/lib/admin/health';
import type { AdminAlertState, ObservabilityErrorsFeed } from '@/lib/admin/types';

/**
 * "Is the app healthy right now?" — the strip at the top of Errors & Health
 * (PoolWeb #14).
 *
 * Everything below it on that tab is correct and none of it answers a founder's
 * actual question. A signal tile reading `Pool timeout (P2024): 3` requires you
 * to already know what a connection pool is; an empty CloudWatch panel requires
 * you to know that empty does not mean healthy. This strip states the verdict in
 * one sentence, colours it, and then lists — in plain language — every reason it
 * is not green, worst first.
 *
 * It invents nothing: `deriveHealth` is a pure function of the two payloads the
 * page already holds (#116's errors feed and #190's alert state), so the verdict
 * can never disagree with the panels underneath it.
 *
 * ⚠️ THE FOURTH COLOUR IS THE POINT. Green / amber / red are the obvious three;
 * the one that matters is the grey "can't tell", used whenever a source could
 * not be read. The whole #116 design exists because an empty panel must never be
 * mistaken for a healthy one, and a summary strip is exactly where that mistake
 * would be made permanent.
 */

const LEVEL_STYLES: Readonly<
  Record<HealthLevel, { card: string; icon: string; badge: string; label: string }>
> = {
  [HealthLevel.Critical]: {
    card: 'border-destructive/60 bg-destructive/5',
    icon: 'text-destructive',
    badge: 'border-destructive/50 bg-destructive/10 text-destructive',
    label: 'Needs attention now',
  },
  [HealthLevel.Warning]: {
    card: 'border-amber-500/50 bg-amber-400/5',
    icon: 'text-amber-600 dark:text-amber-400',
    badge: 'border-amber-500/50 bg-amber-400/15 text-amber-700 dark:text-amber-400',
    label: 'Worth a look',
  },
  [HealthLevel.Unknown]: {
    card: 'border-border bg-muted/40',
    icon: 'text-muted-foreground',
    badge: 'border-border bg-muted text-muted-foreground',
    label: 'Not fully checked',
  },
  [HealthLevel.Ok]: {
    card: 'border-emerald-500/40 bg-emerald-500/5',
    icon: 'text-emerald-600 dark:text-emerald-400',
    badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    label: 'All clear',
  },
};

function levelIcon(level: HealthLevel) {
  if (level === HealthLevel.Critical) return XCircle;
  if (level === HealthLevel.Warning) return AlertTriangle;
  if (level === HealthLevel.Unknown) return HelpCircle;
  return CheckCircle2;
}

function FindingRow({ finding }: { finding: HealthFinding }) {
  const styles = LEVEL_STYLES[finding.level];
  const Icon = levelIcon(finding.level);
  return (
    <li className="flex gap-2.5">
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', styles.icon)} />
      <div>
        <p className="text-sm font-medium">{finding.title}</p>
        <p className="text-xs text-muted-foreground">{finding.detail}</p>
      </div>
    </li>
  );
}

export function HealthSummary({
  alerts,
  feed,
  loading,
}: {
  alerts: AdminAlertState | null;
  feed: ObservabilityErrorsFeed | null;
  /** True only before the first read of EITHER source has resolved. */
  loading: boolean;
}) {
  // Deliberately not rendered as "can't tell" while the very first read is still
  // in flight — an unresolved fetch is not a failed one, and flashing a grey
  // "not fully checked" verdict for a second on every page load would teach a
  // founder to ignore the state that matters most.
  if (loading && !alerts && !feed) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking the platform&apos;s health…
        </CardContent>
      </Card>
    );
  }

  const verdict = deriveHealth({ alerts, feed });
  const styles = LEVEL_STYLES[verdict.level];
  const Icon = levelIcon(verdict.level);

  return (
    <Card className={cn(styles.card)}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <Icon className={cn('mt-0.5 h-7 w-7 shrink-0', styles.icon)} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold">{verdict.headline}</h2>
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                  styles.badge,
                )}
              >
                {styles.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{verdict.subline}</p>
          </div>
        </div>

        {verdict.findings.length > 0 && (
          <ul className="space-y-2 border-t pt-3">
            {verdict.findings.map((finding) => (
              <FindingRow key={finding.key} finding={finding} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
