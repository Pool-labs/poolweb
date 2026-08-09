'use client';

import { cn } from '@/lib/utils';
import { formatLogTime, SIGNAL_LABELS, USER_SOURCE_COPY } from '@/lib/admin/observability';
import {
  ObservabilitySignal,
  ObservabilityUserSource,
  PinoLevel,
  type AuditLogEntry,
  type ObservabilityLogEntry,
  type ObservabilityUserAnalyticsRecord,
  type ObservabilityUserTimelineEntry,
} from '@/lib/admin/types';

/**
 * The merged per-user timeline (PoolWeb #14, over poolmobile #263).
 *
 * THREE STORES, ONE LIST, LABELLED PER ENTRY. They are merged because a support
 * question ("they say the deposit vanished") is answered by reading them against
 * each other — the request that 500'd, the audit row that did or did not commit,
 * the screen the user was on — and they are LABELLED because they are not
 * equally trustworthy. Every row therefore carries its source badge, and the
 * page states what each source's authority is before the list starts.
 *
 * ⚠️ SECURITY — EVERYTHING HERE IS RENDERED AS TEXT. `path`, `message`,
 * `errorMessage` and `requestId` are attacker-influenceable free text (the #116
 * review's L3/L4), audit `metadata` is an arbitrary JSON object, and analytics
 * `props` are client-supplied. There is deliberately NO `dangerouslySetInnerHTML`
 * anywhere on this surface, and no payload value is EVER used as an `href`, a
 * `src`, a `style` value or a link target. The only navigation on this page goes
 * to a route built from the id the admin themselves picked. Keep it that way.
 *
 * ⚠️ PRIVACY — audit metadata DELIBERATELY carries money in integer cents and,
 * for #146 rows, payment handles. That is correct on an identity-gated admin
 * surface (the same posture under which #82 exposes a pool's whole ledger): an
 * audit trail with the amounts removed cannot answer the question it exists for.
 * It is not, however, something to copy anywhere else.
 */

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

/**
 * Render one metadata/props value as a string.
 *
 * Objects and arrays are JSON-stringified rather than dropped — an audit row's
 * most useful field is often nested (`{ amountCents, balanceAfterCents }`), and
 * a support pull that silently hides half the record is worse than a slightly
 * dense one. The result is still a plain React text child.
 */
function displayValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserialisable]';
  }
}

/** A small key/value grid. Keys and values are both plain text children. */
function KeyValues({ record }: { record: Record<string, unknown> }) {
  const entries = Object.entries(record);
  if (entries.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
      {entries.map(([key, value]) => (
        <span key={key} className="font-mono text-[11px] text-muted-foreground">
          <span className="opacity-70">{key}</span>{' '}
          <span className="break-all text-foreground">{displayValue(value)}</span>
        </span>
      ))}
    </div>
  );
}

function Correlation({
  requestId,
  extra,
}: {
  requestId: string | null;
  extra?: Array<[string, string | null]>;
}) {
  const parts: Array<[string, string]> = [];
  if (requestId) parts.push(['request', requestId]);
  for (const [label, value] of extra ?? []) {
    if (value) parts.push([label, value]);
  }
  if (parts.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-4 font-mono text-[11px] text-muted-foreground">
      {parts.map(([label, value]) => (
        <span key={label} className="break-all">
          {label} {value}
        </span>
      ))}
    </div>
  );
}

function LogRow({ log }: { log: ObservabilityLogEntry }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('text-[11px] font-semibold uppercase', levelClass(log.level))}>
          {log.levelLabel}
        </span>
        {log.signal !== ObservabilitySignal.Other && (
          <span className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {SIGNAL_LABELS[log.signal] ?? log.signal}
          </span>
        )}
        {/* TEXT ONLY — `path` is caller-controlled and is never an href. */}
        <span className="break-all font-mono text-xs">
          {log.method ? `${log.method} ` : ''}
          {log.path ?? ''}
        </span>
        {log.status !== null && (
          <span className={cn('font-mono text-xs', statusClass(log.status))}>{log.status}</span>
        )}
        {log.durationMs !== null && (
          <span className="font-mono text-[11px] text-muted-foreground">{log.durationMs}ms</span>
        )}
        {log.errorCode && (
          <span className="font-mono text-xs text-destructive">{log.errorCode}</span>
        )}
      </div>

      {(log.errorMessage || log.message) && (
        <p className="mt-1 break-words text-xs">
          {log.errorMessage || log.message}
          {log.errorType && <span className="ml-1 text-muted-foreground">({log.errorType})</span>}
        </p>
      )}

      <Correlation requestId={log.requestId} extra={[['task', log.logStream]]} />
    </div>
  );
}

function AuditRow({ audit }: { audit: AuditLogEntry }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {/* The server's dot-namespaced wire value, rendered verbatim: this
            dashboard deliberately carries no copy of the (fast-growing) action
            vocabulary, so a brand-new action reads correctly with no deploy. */}
        <span className="font-mono text-xs font-semibold">{audit.action}</span>
        <span className="text-[11px] text-muted-foreground">
          on {audit.targetType}
          {audit.targetId ? ` ${audit.targetId}` : ''}
        </span>
      </div>

      {/* DELIBERATELY includes money (integer cents) and, for #146 rows, payment
          handles — see the file header. Values are text children. */}
      <KeyValues record={audit.metadata} />

      <Correlation
        requestId={audit.requestId}
        extra={[
          ['pool', audit.poolId],
          ['actor', audit.actorId],
          ['ip', audit.ip],
        ]}
      />
    </div>
  );
}

function AnalyticsRow({ analytics }: { analytics: ObservabilityUserAnalyticsRecord }) {
  // The timeline is ordered by the SERVER's ingest time so a device with a wrong
  // clock cannot reorder the server's own lines — which means the client's own
  // claim about when it happened is only worth showing when the two disagree.
  const clockSkew = analytics.occurredAt.slice(0, 19) !== analytics.createdAt.slice(0, 19);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-semibold">{analytics.name}</span>
        <span className="text-[11px] text-muted-foreground">
          {analytics.platform}
          {analytics.appVersion ? ` · v${analytics.appVersion}` : ''}
        </span>
        {clockSkew && (
          <span
            title="The device reported a different time than the server recorded. The timeline uses the server's."
            className="text-[11px] text-muted-foreground"
          >
            device said {formatLogTime(analytics.occurredAt)}
          </span>
        )}
      </div>

      <KeyValues record={analytics.props} />

      <div className="mt-1.5 font-mono text-[11px] text-muted-foreground">
        <span className="break-all">session {analytics.sessionId}</span>
      </div>
    </div>
  );
}

export function UserTimeline({ entries }: { entries: ObservabilityUserTimelineEntry[] }) {
  return (
    <ol className="space-y-2">
      {entries.map((entry, i) => {
        const copy = USER_SOURCE_COPY[entry.source];
        return (
          // No stable per-entry id exists across all three sources (CloudWatch
          // gives none at all through FilterLogEvents), so the key is composed
          // with the index as the final tiebreak. The list is read-only and
          // never reordered client-side, so an index component is safe here.
          <li
            key={`${entry.source}-${entry.timestamp}-${i}`}
            className="flex gap-3 rounded-lg border p-3"
          >
            <div className="flex w-32 shrink-0 flex-col gap-1">
              <span className="font-mono text-[11px] text-muted-foreground">
                {formatLogTime(entry.timestamp)}
              </span>
              <span
                title={copy.authority}
                className={cn(
                  'inline-flex w-fit items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold',
                  copy.className,
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', copy.dotClassName)} />
                {copy.label}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              {entry.source === ObservabilityUserSource.Logs ? (
                <LogRow log={entry.log} />
              ) : entry.source === ObservabilityUserSource.Audit ? (
                <AuditRow audit={entry.audit} />
              ) : (
                <AnalyticsRow analytics={entry.analytics} />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
