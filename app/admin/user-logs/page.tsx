'use client';

/**
 * Per-user logs (PoolWeb #14, consuming poolmobile #263).
 *
 * The support/debug pull: someone reports a problem, a founder selects that
 * person and gets everything the platform recorded about them inside a bounded
 * window — the API's own request logs, their audit trail (in BOTH directions:
 * what they did, and what was done to them), and their behavioural telemetry —
 * merged into one newest-first timeline, labelled per source.
 *
 * ⚠️ REQUEST-ON-DEMAND, AND THAT IS NOT A UI PREFERENCE. Nothing is fetched
 * until an admin picks a user and presses Fetch, and there is deliberately NO
 * auto-refresh and NO polling anywhere on this page — unlike the Errors tab,
 * whose alert panel polls on a timer. The endpoint is AUDITED ON VIEW server-side
 * (`admin.user_logs_viewed`, target = the named user), so a background poller
 * would write an audit row every interval asserting that a founder looked up a
 * named person's history when nobody did. Pulling one person's history must cost
 * a deliberate act, and the audit trail must only ever record deliberate acts.
 *
 * ⚠️ Every value from the payload is rendered as TEXT (see `UserTimeline`'s
 * header). The one link on this page is built from the id the admin picked, not
 * from anything inside a log line.
 *
 * The filters mirror the API's Zod bounds (`observabilityUserLogsQuerySchema`),
 * so an out-of-range window degrades to a 400 rather than an unbounded scan —
 * and `limit` is PER SOURCE, which the copy says out loud because a "100" that
 * can return 300 rows is otherwise quietly confusing.
 */

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ExternalLink, Loader2, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPicker, type PickedUser } from '@/components/admin/UserPicker';
import {
  SourceStatusNotice,
  SourceStatusPill,
} from '@/components/admin/observability/SourceStatusNotice';
import { UserTimeline } from '@/components/admin/observability/UserTimeline';
import { observabilityApi } from '@/lib/admin/adminApi';
import { formatDateTime } from '@/lib/admin/format';
import {
  isSourceTrustworthy,
  OBSERVABILITY_USER_LOGS,
  USER_LOG_LIMIT_OPTIONS,
  USER_LOG_WINDOW_OPTIONS,
  USER_SOURCE_COPY,
  USER_SOURCE_KIND,
  USER_SOURCE_ORDER,
} from '@/lib/admin/observability';
import {
  ObservabilitySourceStatus,
  ObservabilityUserSource,
  type ObservabilityUserLogs,
  type ObservabilityUserSourceState,
} from '@/lib/admin/types';

function windowLabel(hours: number): string {
  if (hours < 24) return `Last ${hours}h`;
  const days = hours / 24;
  return days === 1 ? 'Last 24h' : `Last ${days} days`;
}

/** All three per-source states, in the fixed most-authoritative-first order. */
function sourceStates(
  logs: ObservabilityUserLogs,
): Array<[ObservabilityUserSource, ObservabilityUserSourceState]> {
  return USER_SOURCE_ORDER.map((source) => [source, logs.sources[source]]);
}

export default function AdminUserLogsPage() {
  const [selected, setSelected] = useState<PickedUser[]>([]);
  const [hours, setHours] = useState<number>(OBSERVABILITY_USER_LOGS.DEFAULT_WINDOW_HOURS);
  const [limit, setLimit] = useState<number>(OBSERVABILITY_USER_LOGS.DEFAULT_LIMIT);
  const [hidden, setHidden] = useState<ObservabilityUserSource[]>([]);

  const [result, setResult] = useState<ObservabilityUserLogs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = selected[0] ?? null;

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await observabilityApi.userLogs({ userId: user.id, hours, limit }));
    } catch (e) {
      // Every SOURCE fails open server-side, so an error here means the CALL
      // failed — auth, network, or a rejected parameter (a non-uuid id is a
      // 400). Distinct from an unavailable source, and shown as such.
      setError(e instanceof Error ? e.message : 'Failed to fetch this user’s logs');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [user, hours, limit]);

  const toggleSource = (source: ObservabilityUserSource) =>
    setHidden((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source],
    );

  // Client-side only, and only ever a NARROWING of what was already fetched —
  // it never re-queries, so toggling a chip writes no second audit row.
  const visibleEntries = useMemo(
    () => (result ? result.entries.filter((e) => !hidden.includes(e.source)) : []),
    [result, hidden],
  );

  const stale = Boolean(result && user && result.userId !== user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User logs</h1>
        <p className="text-sm text-muted-foreground">
          Everything this environment recorded about one person — request logs, audit trail and app
          events — inside a bounded window. Nothing is fetched until you ask, and each pull is
          itself recorded in the audit trail.
        </p>
      </div>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Who, and how far back</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-2">
          <UserPicker
            label="User"
            selected={selected}
            onChange={setSelected}
            max={1}
            placeholder="Search by email, username, or name..."
            hint="Search the same directory as the Users tab, or paste a user id directly."
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="window">Window</Label>
              <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
                <SelectTrigger id="window" className="w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_LOG_WINDOW_OPTIONS.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {windowLabel(h)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="limit">Entries per source</Label>
              <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                <SelectTrigger id="limit" className="w-full sm:w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_LOG_LIMIT_OPTIONS.map((l) => (
                    <SelectItem key={l} value={String(l)}>
                      {l} per source
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => void fetchLogs()} disabled={!user || loading}>
              {loading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-1.5 h-4 w-4" />
              )}
              Fetch logs
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            The limit applies to <strong>each</strong> of the three sources, so a full page can
            return up to {limit * 3} entries. Windows are capped at{' '}
            {OBSERVABILITY_USER_LOGS.MAX_WINDOW_HOURS / 24} days server-side — a wider search is a
            slow, billable log scan.
          </p>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Could not fetch this user’s logs</AlertTitle>
          <AlertDescription className="text-xs">
            {error} — this is a failure of the request itself, not of one log source. Nothing below
            can be trusted as a complete picture.
          </AlertDescription>
        </Alert>
      )}

      {!result && !loading && !error && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Pick a user and press <strong>Fetch logs</strong>. Nothing is loaded until you do.
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {stale && (
            <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-sm">Showing a different user</AlertTitle>
              <AlertDescription className="text-xs">
                These results are for the previously fetched user. Press Fetch logs again for{' '}
                {user?.name}.
              </AlertDescription>
            </Alert>
          )}

          {/* Provenance: WHOSE logs, from WHICH deployment, over WHICH window.
              The log group is set per-environment by Terraform and never derived
              client-side, so this line is proof rather than a label. */}
          <Card>
            <CardContent className="flex flex-col gap-1 p-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span className="break-all font-mono">
                {result.source.logGroup ?? 'no log group configured'}
                <span className="ml-2 rounded border px-1.5 py-0.5 font-semibold uppercase tracking-wide">
                  {result.source.environment}
                </span>
              </span>
              <span>
                {formatDateTime(result.window.since)} → {formatDateTime(result.window.until)} (
                {result.window.hours}h)
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-2 space-y-0 p-4 pb-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <CardTitle className="text-sm">Timeline</CardTitle>
                {/* The id is echoed from the RESPONSE, not from local state, so
                    a row can never be attributed to the wrong person. */}
                <span className="break-all font-mono text-[11px] text-muted-foreground">
                  {result.userId}
                </span>
                <Link
                  href={`/admin/users/${encodeURIComponent(result.userId)}`}
                  className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
                >
                  Open account
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {sourceStates(result).map(([source, state]) => (
                  <SourceStatusPill
                    key={source}
                    source={USER_SOURCE_KIND[source]}
                    status={state.status}
                    showTitle
                  />
                ))}
              </div>
            </CardHeader>

            <CardContent className="space-y-3 p-4 pt-2">
              {/* Per-source honesty, one notice per store that could not be
                  read. Each fails open independently, so a missing CloudWatch
                  grant still leaves the audit trail below intact — and the
                  notice says exactly which half is missing. */}
              {sourceStates(result)
                .filter(([, state]) => !isSourceTrustworthy(state.status))
                .map(([source, state]) => (
                  <SourceStatusNotice
                    key={source}
                    source={USER_SOURCE_KIND[source]}
                    status={state.status}
                  />
                ))}

              {sourceStates(result).some(([, state]) => state.truncated) && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-sm">Truncated</AlertTitle>
                  <AlertDescription className="text-xs">
                    At least one source held more entries than the {limit}-per-source page. What you
                    see is the most recent slice, not the whole window — narrow the window or raise
                    the limit.
                  </AlertDescription>
                </Alert>
              )}

              {/* Source filter + authority legend in one row: toggling a chip
                  narrows what is already on screen and never re-queries. */}
              <div className="flex flex-wrap gap-2">
                {sourceStates(result).map(([source, state]) => {
                  const copy = USER_SOURCE_COPY[source];
                  const on = !hidden.includes(source);
                  return (
                    <button
                      key={source}
                      type="button"
                      onClick={() => toggleSource(source)}
                      aria-pressed={on}
                      title={copy.authority}
                      className={
                        on
                          ? `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${copy.className}`
                          : 'inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground line-through'
                      }
                    >
                      {copy.label}
                      <span className="opacity-70">
                        {state.status === ObservabilitySourceStatus.Ok ? state.count : '—'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground">
                {USER_SOURCE_COPY[ObservabilityUserSource.Audit].authority}
              </p>

              {visibleEntries.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {result.entries.length === 0
                    ? 'Nothing was recorded for this user in this window.'
                    : 'Every source is hidden — turn one back on above.'}
                </p>
              ) : (
                <UserTimeline entries={visibleEntries} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
