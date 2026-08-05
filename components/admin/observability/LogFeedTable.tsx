'use client';

import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatLogTime, SIGNAL_LABELS } from '@/lib/admin/observability';
import { ObservabilitySignal, PinoLevel, type ObservabilityLogEntry } from '@/lib/admin/types';

/**
 * The raw failures feed (#116), most-recent-first as the API returns it.
 *
 * ⚠️ SECURITY (flagged L3/L4 by the #116 review): `path`, `message`,
 * `errorMessage` and `requestId` are ATTACKER-INFLUENCEABLE free text — a
 * caller can put anything in a URL path or an error string and get it logged.
 * Every one of them is rendered here as a plain React text child, which React
 * escapes. There is deliberately NO `dangerouslySetInnerHTML` anywhere in this
 * surface, and none of these values is ever used as an `href`, a `src`, a
 * `style` value or a link target. Keep it that way.
 *
 * The server already truncates the two free-text fields and forwards a strict
 * field allowlist (no raw log line, no bodies, no headers, no stack traces).
 */

const SIGNAL_TONE: Record<ObservabilitySignal, string> = {
  [ObservabilitySignal.TransactionContention]:
    'border-amber-500/50 bg-amber-400/15 text-amber-700 dark:text-amber-400',
  [ObservabilitySignal.ConnectionPoolTimeout]:
    'border-amber-500/50 bg-amber-400/15 text-amber-700 dark:text-amber-400',
  [ObservabilitySignal.NotificationFailure]:
    'border-amber-500/50 bg-amber-400/15 text-amber-700 dark:text-amber-400',
  [ObservabilitySignal.Error]: 'border-destructive/50 bg-destructive/10 text-destructive',
  [ObservabilitySignal.FailedRequest]: 'border-destructive/40 bg-destructive/5 text-destructive',
  [ObservabilitySignal.Other]: 'border-border bg-muted text-muted-foreground',
};

function levelClass(level: number): string {
  if (level >= PinoLevel.Error) return 'text-destructive';
  if (level >= PinoLevel.Warn) return 'text-amber-600 dark:text-amber-400';
  return 'text-muted-foreground';
}

function statusClass(status: number | null): string {
  if (status === null) return 'text-muted-foreground';
  if (status >= 500) return 'text-destructive font-medium';
  if (status >= 400) return 'text-amber-600 dark:text-amber-400';
  return 'text-muted-foreground';
}

export function LogFeedTable({ entries }: { entries: ObservabilityLogEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Time (local)</TableHead>
            <TableHead>Signal</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Request</TableHead>
            <TableHead className="text-right">Status</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Correlation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((e, i) => (
            // CloudWatch gives no per-event id through FilterLogEvents, and two
            // lines can share a timestamp — so the key is composed, with the
            // index as the final tiebreak. The list is read-only and never
            // reordered client-side, so an index component is safe here.
            <TableRow key={`${e.timestamp}-${e.requestId ?? 'anon'}-${i}`}>
              <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                {formatLogTime(e.timestamp)}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn('whitespace-nowrap', SIGNAL_TONE[e.signal])}>
                  {SIGNAL_LABELS[e.signal] ?? e.signal}
                </Badge>
              </TableCell>
              <TableCell className={cn('text-xs font-medium uppercase', levelClass(e.level))}>
                {e.levelLabel}
              </TableCell>
              <TableCell className="max-w-[22rem] font-mono text-xs">
                {e.method || e.path ? (
                  // Rendered as TEXT — never an href. `path` is caller-controlled.
                  <span className="break-all">
                    {e.method ? `${e.method} ` : ''}
                    {e.path ?? ''}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className={cn('text-right font-mono text-xs', statusClass(e.status))}>
                {e.status ?? '—'}
              </TableCell>
              <TableCell className="whitespace-nowrap font-mono text-xs">
                {e.errorCode ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="max-w-[28rem] text-xs">
                {/* Free text from the log line. TEXT ONLY. */}
                <span className="break-words">{e.errorMessage || e.message || '—'}</span>
                {e.errorType && (
                  <span className="ml-1 text-muted-foreground">({e.errorType})</span>
                )}
              </TableCell>
              <TableCell className="max-w-[14rem] font-mono text-[11px] text-muted-foreground">
                <div className="break-all">{e.requestId ?? '—'}</div>
                {e.userId && <div className="break-all">user {e.userId}</div>}
                {e.logStream && <div className="break-all opacity-70">{e.logStream}</div>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
