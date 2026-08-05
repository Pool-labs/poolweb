'use client';

import { AlertTriangle, CheckCircle2, CircleSlash, XCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  isSourceTrustworthy,
  sourceStatusCopy,
  type SourceKind,
} from '@/lib/admin/observability';
import { ObservabilitySourceStatus } from '@/lib/admin/types';

/**
 * The honest "why is this panel empty" banner (#116).
 *
 * Both halves of the feed FAIL OPEN server-side, so a panel can be empty for
 * four completely different reasons. Rendering nothing would let three of them
 * read as the fourth — "no failures" — which is the single most dangerous thing
 * an ops dashboard can imply. So:
 *
 *  - `Ok`      → a quiet, factual confirmation that the source WAS queried.
 *  - anything else → a visible warning that says nobody looked, and that
 *    failures may exist which are not shown.
 *
 * The banner is therefore always rendered, never conditionally hidden on
 * "status is fine" — the reassurance is as load-bearing as the warning.
 */
export function SourceStatusNotice({
  source,
  status,
  className,
}: {
  source: SourceKind;
  status: ObservabilitySourceStatus;
  className?: string;
}) {
  const copy = sourceStatusCopy(source, status);
  const trustworthy = isSourceTrustworthy(status);
  const Icon =
    copy.tone === 'ok'
      ? CheckCircle2
      : copy.tone === 'danger'
        ? XCircle
        : status === ObservabilitySourceStatus.Disabled
          ? CircleSlash
          : AlertTriangle;

  return (
    <Alert
      variant={copy.tone === 'danger' ? 'destructive' : 'default'}
      className={cn(
        copy.tone === 'ok' && 'border-emerald-500/40 bg-emerald-500/5',
        copy.tone === 'warning' && 'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200',
        className,
      )}
    >
      <Icon className="h-4 w-4" />
      <AlertTitle className="text-sm">
        {source === 'logs' ? 'CloudWatch logs' : 'Sentry'}: {copy.label}
      </AlertTitle>
      <AlertDescription className="text-xs">
        {copy.detail}
        {!trustworthy && (
          <>
            {' '}
            <strong>An empty panel below does not mean the environment is healthy.</strong>
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}

/** Compact inline pill for the panel header, mirroring the notice's tone. */
export function SourceStatusPill({
  source,
  status,
}: {
  source: SourceKind;
  status: ObservabilitySourceStatus;
}) {
  const copy = sourceStatusCopy(source, status);
  return (
    <span
      className={cn(
        'whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide',
        copy.tone === 'ok' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        copy.tone === 'warning' && 'border-amber-500/50 bg-amber-400/15 text-amber-700 dark:text-amber-400',
        copy.tone === 'danger' && 'border-destructive/50 bg-destructive/10 text-destructive',
      )}
    >
      {copy.label}
    </span>
  );
}
