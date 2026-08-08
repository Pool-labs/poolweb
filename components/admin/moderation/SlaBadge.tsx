'use client';

/**
 * The SLA countdown (poolmobile #158's published commitment: triage in 24h,
 * resolve in 72h).
 *
 * It is the only thing on the queue that ranks the work, so it says the same
 * thing three ways — colour, milestone name, and the countdown in words — and
 * it never goes quiet: a report that was resolved LATE still renders as a
 * breach, because a breach that disappears the moment the row is closed teaches
 * nobody anything and makes the published promise unauditable.
 *
 * `now` is passed in rather than read here, so every badge on a page ticks from
 * ONE clock (and so the value is testable without freezing time globally).
 */

import { cn } from '@/lib/utils';
import {
  formatSlaCountdown,
  reportSla,
  slaTone,
  SLA_MILESTONE_LABELS,
  type ReportSla,
} from '@/lib/admin/moderation';
import type { ReportStatus } from '@/lib/admin/types';

const TONE_CLASSES: Record<ReturnType<typeof slaTone>, string> = {
  breached: 'border-red-600 bg-red-500/10 text-red-700 dark:text-red-400',
  'due-soon': 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  'on-track': 'border-border bg-muted text-muted-foreground',
  done: 'border-border bg-muted text-muted-foreground',
};

function label(sla: ReportSla): string {
  if (sla.milestone === null) {
    if (sla.triageBreached && sla.resolutionBreached) return 'Closed — both targets missed';
    if (sla.resolutionBreached) return 'Closed — past 72h';
    if (sla.triageBreached) return 'Closed — triaged past 24h';
    return 'Closed within target';
  }
  return `${SLA_MILESTONE_LABELS[sla.milestone]} · ${formatSlaCountdown(sla)}`;
}

export function SlaBadge({
  report,
  now,
  className,
}: {
  report: { createdAt: string; status: ReportStatus; reviewedAt: string | null };
  now: number;
  className?: string;
}) {
  const sla = reportSla(report, now);
  const tone = slaTone(sla);

  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
        className,
      )}
      title={
        sla.dueAt !== null
          ? `Due ${new Date(sla.dueAt).toLocaleString('en-US')} — measured from when the report was filed, which is when the reporter was promised a turnaround.`
          : 'Measured against the published commitment: triage within 24h, resolution within 72h.'
      }
    >
      {label(sla)}
    </span>
  );
}
