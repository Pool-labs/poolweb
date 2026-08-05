'use client';

/**
 * Errors / Health tab (poolmobile #192, consuming the #116 API).
 *
 * The read half of everything #26 made the API WRITE: pino's structured logs in
 * CloudWatch, plus Sentry's grouped issues. One endpoint returns both, each
 * failing open independently, so the page's real job is not "draw a table" — it
 * is to never let an empty panel be mistaken for a healthy environment. Every
 * panel therefore carries an explicit `ObservabilitySourceStatus` notice, and
 * only `ok` licenses the words "no failures".
 *
 * ⚠️ Everything from the feed is rendered as TEXT. `path`, `message`,
 * `errorMessage` and `requestId` are attacker-influenceable free text (#116
 * security review, L3/L4). No `dangerouslySetInnerHTML`, and no feed value is
 * ever used as an href — the only hrefs here are Sentry URLs, scheme-checked by
 * `safeHttpUrl`.
 *
 * Read-only surface: it performs no writes and the API deliberately does not
 * audit these reads (the #80/#81 convention — aggregate ops data, no money and
 * no message content).
 */

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SeriesBarChart, type ChartPoint } from '@/components/ui/chart';
import { LogFeedTable } from '@/components/admin/observability/LogFeedTable';
import { SentryPanel } from '@/components/admin/observability/SentryPanel';
import {
  SourceStatusNotice,
  SourceStatusPill,
} from '@/components/admin/observability/SourceStatusNotice';
import { observabilityApi } from '@/lib/admin/adminApi';
import { formatDateTime } from '@/lib/admin/format';
import {
  FEED_KIND_LABELS,
  isSourceTrustworthy,
  LIMIT_OPTIONS,
  MIN_LEVEL_OPTIONS,
  MIN_STATUS_OPTIONS,
  OBSERVABILITY_FEED,
  PINO_LEVEL_LABELS,
  SIGNAL_LABELS,
  SIGNAL_ORDER,
  WINDOW_OPTIONS,
} from '@/lib/admin/observability';
import {
  ObservabilityFeedKind,
  ObservabilitySignal,
  ObservabilitySourceStatus,
  PinoLevel,
  type ObservabilityErrorsFeed,
} from '@/lib/admin/types';

function windowLabel(hours: number): string {
  if (hours < 24) return `Last ${hours}h`;
  const days = hours / 24;
  return days === 1 ? 'Last 24h' : `Last ${days} days`;
}

/**
 * `bySignal` → chart points, in a FIXED order and INCLUDING zeros.
 *
 * The API guarantees every key is present precisely so a series never vanishes
 * between refreshes: a signal at zero must read as "recovered", not as
 * "disappeared". Filtering zeros out here would throw that guarantee away.
 */
function signalPoints(bySignal: Record<ObservabilitySignal, number> | undefined): ChartPoint[] {
  return SIGNAL_ORDER.map((signal) => ({
    label: SIGNAL_LABELS[signal],
    value: bySignal?.[signal] ?? 0,
  }));
}

export default function AdminErrorsPage() {
  const [hours, setHours] = useState<number>(OBSERVABILITY_FEED.DEFAULT_WINDOW_HOURS);
  const [kind, setKind] = useState<ObservabilityFeedKind>(ObservabilityFeedKind.All);
  const [minLevel, setMinLevel] = useState<PinoLevel>(OBSERVABILITY_FEED.DEFAULT_MIN_LEVEL);
  const [minStatus, setMinStatus] = useState<number>(OBSERVABILITY_FEED.DEFAULT_MIN_STATUS);
  const [limit, setLimit] = useState<number>(OBSERVABILITY_FEED.DEFAULT_LIMIT);

  const [feed, setFeed] = useState<ObservabilityErrorsFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFeed(await observabilityApi.errors({ hours, kind, minLevel, minStatus, limit }));
    } catch (e) {
      // The endpoint itself never 500s on a source outage (both halves fail
      // open), so an error here means the CALL failed — auth, network, or a
      // rejected filter. Distinct from an unavailable source, and shown as such.
      setError(e instanceof Error ? e.message : 'Failed to load the errors feed');
      setFeed(null);
    } finally {
      setLoading(false);
    }
  }, [hours, kind, minLevel, minStatus, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const logs = feed?.logs;
  const sentry = feed?.sentry;
  const summary = logs?.summary;
  const logsStatus = logs?.status ?? ObservabilitySourceStatus.Unavailable;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Errors &amp; Health</h1>
          <p className="text-sm text-muted-foreground">
            Recent failures from this environment&apos;s own API logs, plus grouped Sentry issues.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? 'mr-1.5 h-4 w-4 animate-spin' : 'mr-1.5 h-4 w-4'} />
          Refresh
        </Button>
      </div>

      {/* Filters — one row above the charts, mirroring the API's query bounds. */}
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WINDOW_OPTIONS.map((h) => (
              <SelectItem key={h} value={String(h)}>
                {windowLabel(h)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={kind} onValueChange={(v) => setKind(v as ObservabilityFeedKind)}>
          <SelectTrigger className="w-full lg:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(ObservabilityFeedKind).map((k) => (
              <SelectItem key={k} value={k}>
                {FEED_KIND_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* The level axis only applies to `all` / `errors`. */}
        <Select
          value={String(minLevel)}
          onValueChange={(v) => setMinLevel(Number(v) as PinoLevel)}
          disabled={kind === ObservabilityFeedKind.Requests || kind === ObservabilityFeedKind.Signals}
        >
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MIN_LEVEL_OPTIONS.map((l) => (
              <SelectItem key={l} value={String(l)}>
                Level ≥ {PINO_LEVEL_LABELS[l]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* The status axis only applies to `all` / `requests`. */}
        <Select
          value={String(minStatus)}
          onValueChange={(v) => setMinStatus(Number(v))}
          disabled={kind === ObservabilityFeedKind.Errors || kind === ObservabilityFeedKind.Signals}
        >
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MIN_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={String(s)}>
                Status ≥ {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
          <SelectTrigger className="w-full lg:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIMIT_OPTIONS.map((l) => (
              <SelectItem key={l} value={String(l)}>
                {l} lines
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && !feed ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Could not load the errors feed</AlertTitle>
          <AlertDescription className="text-xs">
            {error} — this is a failure of the request itself, not of a log source. Nothing below
            can be trusted as a health signal.
          </AlertDescription>
        </Alert>
      ) : feed ? (
        <>
          {/* Provenance: WHICH deployment's failures these are. The log group is
              set per-environment by Terraform and never derived client-side, so
              this line is proof, not a label. */}
          <Card>
            <CardContent className="flex flex-col gap-1 p-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span className="font-mono break-all">
                {feed.source.logGroup ?? 'no log group configured'}
                <span className="ml-2 rounded border px-1.5 py-0.5 font-semibold uppercase tracking-wide">
                  {feed.source.environment}
                </span>
              </span>
              <span>
                {formatDateTime(feed.window.since)} → {formatDateTime(feed.window.until)} (
                {feed.window.hours}h)
              </span>
            </CardContent>
          </Card>

          {/* Signal tiles. The first three are WARN-level by design: no alarm
              covers them, which is exactly why they lead. */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {SIGNAL_ORDER.filter((s) => s !== ObservabilitySignal.Other).map((signal) => (
              <SignalTile
                key={signal}
                label={SIGNAL_LABELS[signal]}
                value={summary?.bySignal?.[signal] ?? 0}
                trustworthy={isSourceTrustworthy(logsStatus)}
              />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm">Failures by signal</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <SeriesBarChart data={signalPoints(summary?.bySignal)} />
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <BreakdownCard title="By HTTP status" record={summary?.byStatus} />
              <BreakdownCard title="By log level" record={summary?.byLevel} />
            </div>
          </div>

          {/* CloudWatch feed */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-4 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">Recent failures</CardTitle>
                <SourceStatusPill source="logs" status={logsStatus} />
              </div>
              <span className="text-xs text-muted-foreground">
                {summary?.errorCount ?? 0} errors · {summary?.failedRequestCount ?? 0} failed
                requests
              </span>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-2">
              <SourceStatusNotice source="logs" status={logsStatus} />

              {logs?.truncated && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-sm">Truncated</AlertTitle>
                  <AlertDescription className="text-xs">
                    The window held more lines than the {limit}-line page. Narrow the window or the
                    filters — what you see is the most recent slice, not the whole picture.
                  </AlertDescription>
                </Alert>
              )}

              {!logs || logs.entries.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {isSourceTrustworthy(logsStatus)
                    ? 'No matching failures in this window.'
                    : 'No lines could be read. See the notice above for why.'}
                </p>
              ) : (
                <LogFeedTable entries={logs.entries} />
              )}
            </CardContent>
          </Card>

          <SentryPanel
            status={sentry?.status ?? ObservabilitySourceStatus.Unavailable}
            issuesUrl={sentry?.issuesUrl ?? null}
            summary={sentry?.summary ?? null}
          />
        </>
      ) : null}
    </div>
  );
}

/**
 * A count tile. When the log source is NOT trustworthy the number is shown as
 * "—" rather than "0": a zero read off a source nobody queried is a lie in the
 * most dangerous direction.
 */
function SignalTile({
  label,
  value,
  trustworthy,
}: {
  label: string;
  value: number;
  trustworthy: boolean;
}) {
  return (
    <Card>
      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className={value > 0 ? 'text-2xl font-bold text-destructive' : 'text-2xl font-bold'}>
          {trustworthy ? value : '—'}
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  record,
}: {
  title: string;
  record: Record<string, number> | undefined;
}) {
  const entries = Object.entries(record ?? {}).sort((a, b) => b[1] - a[1]);
  return (
    <Card>
      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing in this window</p>
        ) : (
          <div className="space-y-1.5">
            {entries.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="font-mono text-muted-foreground">{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
