'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, HelpCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SeriesLineChart, SeriesBarChart, ChartPoint } from '@/components/ui/chart';
import { metricsApi, funnelsApi, observabilityApi } from '@/lib/admin/adminApi';
import { humanizeEnum } from '@/lib/admin/format';
import { ALARM_STATE_COPY, ALARM_STATE_SEVERITY } from '@/lib/admin/observability';
import { cn } from '@/lib/utils';
import {
  AdminAlarmState,
  ObservabilitySourceStatus,
  type AdminActivationMetrics,
  type AdminActiveUsersMetrics,
  type AdminAlertState,
  type AdminEngagementMetrics,
  type AdminPoolMetrics,
  type AdminSignupsMetrics,
  type AdminTransactionMetrics,
  type FunnelReport,
  type MetricBucket,
  type MoneyEventCountsReport,
  type PoolFunnelReport,
} from '@/lib/admin/types';

/**
 * Overview (#80 metrics + #81 funnels + #592 activation), regrouped into
 * labelled sections by poolweb #31 — Growth · Activation · Pools ·
 * Engagement & money · Health — so it reads as a set of related panels rather
 * than one wall of tiles.
 *
 * A LAYOUT reorganisation, deliberately: every panel the page loaded before is
 * still here, the same ten calls are made, and the one range control still
 * scopes every windowed section (each section heading says so). The two
 * additions render data the page was ALREADY loading and dropping on the floor
 * (the last-seen histogram, the points/streak distributions) — no new server
 * work was needed for them.
 *
 * Health is the exception to the window rule and says so on its heading: it is
 * the #190 alarm state, which is LIVE — a range has no meaning for "is anything
 * on fire right now". It is read once per page load (the layout-level banner
 * already polls) and links into Errors & Health for the detail.
 */

const WINDOW_OPTIONS = [7, 30, 90];

interface OverviewData {
  activeUsers: AdminActiveUsersMetrics | null;
  signups: AdminSignupsMetrics | null;
  activation: AdminActivationMetrics | null;
  pools: AdminPoolMetrics | null;
  transactions: AdminTransactionMetrics | null;
  engagement: AdminEngagementMetrics | null;
  authFunnel: FunnelReport | null;
  poolFunnel: PoolFunnelReport | null;
  discoverFunnel: FunnelReport | null;
  moneyEvents: MoneyEventCountsReport | null;
  alerts: AdminAlertState | null;
}

const EMPTY: OverviewData = {
  activeUsers: null,
  signups: null,
  activation: null,
  pools: null,
  transactions: null,
  engagement: null,
  authFunnel: null,
  poolFunnel: null,
  discoverFunnel: null,
  moneyEvents: null,
  alerts: null,
};

function pick<T>(r: PromiseSettledResult<T>): T | null {
  return r.status === 'fulfilled' ? r.value : null;
}

export default function AdminOverviewPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<OverviewData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (windowDays: number) => {
    setLoading(true);
    setError(null);
    const [
      activeUsers,
      signups,
      activation,
      pools,
      transactions,
      engagement,
      authFunnel,
      poolFunnel,
      discoverFunnel,
      moneyEvents,
      alerts,
    ] = await Promise.allSettled([
      metricsApi.activeUsers(windowDays),
      metricsApi.signups(windowDays),
      // Same window as signups on purpose (#592): the two panels answer the
      // same question from two sources, and only a shared window makes a
      // divergence between them mean something (a telemetry outage).
      metricsApi.activation(windowDays),
      metricsApi.pools(windowDays),
      metricsApi.transactions(windowDays),
      metricsApi.engagement(windowDays),
      funnelsApi.auth(windowDays),
      funnelsApi.pool(windowDays),
      funnelsApi.discover(windowDays),
      funnelsApi.moneyEvents(windowDays),
      // Live, un-windowed: the Health section's source (#190).
      observabilityApi.alerts(),
    ]);

    const next: OverviewData = {
      activeUsers: pick(activeUsers),
      signups: pick(signups),
      activation: pick(activation),
      pools: pick(pools),
      transactions: pick(transactions),
      engagement: pick(engagement),
      authFunnel: pick(authFunnel),
      poolFunnel: pick(poolFunnel),
      discoverFunnel: pick(discoverFunnel),
      moneyEvents: pick(moneyEvents),
      alerts: pick(alerts),
    };
    // The metrics calls decide the page's fate; the alerts read never does —
    // a health panel that cannot load says so in its own card.
    const { alerts: _alerts, ...metricsOnly } = next;
    const allFailed = Object.values(metricsOnly).every((v) => v === null);
    if (allFailed) setError('Could not load metrics. Check the API connection and try again.');
    setData(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  const windowLabel = `Last ${days} days`;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Overview</h1>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-36" aria-label="Date range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WINDOW_OPTIONS.map((d) => (
              <SelectItem key={d} value={String(d)}>
                Last {d} days
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : (
        <>
          {/* ── Growth ─────────────────────────────────────────────────── */}
          <Section id="growth" title="Growth" scope={windowLabel}>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <StatTile label="DAU" value={data.activeUsers?.dau} />
              <StatTile label="WAU" value={data.activeUsers?.wau} />
              <StatTile label="MAU" value={data.activeUsers?.mau} />
              <StatTile label="Signups (all time)" value={data.signups?.totalAllTime} />
              <StatTile label={`Signups (last ${days}d)`} value={data.signups?.totalInWindow} />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <ChartCard title="Signups per day" className="lg:col-span-2">
                <SeriesLineChart
                  data={(data.signups?.series ?? []).map((p) => ({ label: p.date, value: p.signups }))}
                />
              </ChartCard>
              {/* Rendered for the first time here — the histogram has always
                  ridden along on the active-users payload. */}
              <DistributionCard
                title="Accounts by last seen"
                entries={bucketsToEntries(data.activeUsers?.lastSeenDistribution)}
                labelFn={bucketLabel}
              />
            </div>
          </Section>

          {/* ── Activation ─────────────────────────────────────────────── */}
          <Section id="activation" title="Activation" scope={windowLabel}>
            <div className="grid gap-4 lg:grid-cols-3">
              {/*
               * Activation (#592) is server-derived from `users` through the
               * app's own signup predicate, so the auth funnel's client-emitted
               * `onboarding_completed` (beside it) has something to be checked
               * against. Its window denominator excludes soft-deleted accounts,
               * so it may sit below the Growth section's signups tile; that is
               * documented on the type, not a bug.
               */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-1">
                <StatTile
                  label={`Activated (last ${days}d)`}
                  value={data.activation?.activatedInWindow}
                  sub={
                    data.activation
                      ? `${formatRate(data.activation.activationRateInWindow)} of ${data.activation.signupsInWindow} window signups`
                      : undefined
                  }
                />
                <StatTile
                  label="Activated (all time)"
                  value={data.activation?.activatedAllTime}
                  sub={
                    data.activation
                      ? `${formatRate(data.activation.activationRateAllTime)} of ${data.activation.totalUsers} accounts`
                      : undefined
                  }
                />
              </div>
              {/*
               * Where the un-activated are held, by signup requirement (all
               * time). An account blocked on several is counted under each —
               * "how many are held at the Age step" is the answerable question.
               */}
              <DistributionCard
                title="Un-activated — held at (all time)"
                record={data.activation?.blockedByRequirement}
              />
              {data.authFunnel ? (
                <FunnelCard title="Auth funnel (client events)" report={data.authFunnel} />
              ) : (
                <MissingCard title="Auth funnel (client events)" />
              )}
            </div>
          </Section>

          {/* ── Pools ──────────────────────────────────────────────────── */}
          <Section id="pools" title="Pools" scope={windowLabel}>
            <div className="grid gap-4 lg:grid-cols-4">
              <StatTile label="Total pools" value={data.pools?.total} />
              <ChartCard title="New pools per day" className="lg:col-span-3">
                <SeriesLineChart
                  data={(data.pools?.newPoolsSeries ?? []).map((p) => ({
                    label: p.date,
                    value: p.count,
                  }))}
                />
              </ChartCard>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <ChartCard title="Pools by type">
                <SeriesBarChart data={recordToPoints(data.pools?.byType, humanizeEnum)} />
              </ChartCard>
              <DistributionCard title="Pools by status" record={data.pools?.byStatus} />
              <DistributionCard title="Pools by visibility" record={data.pools?.byVisibility} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {data.poolFunnel ? (
                <>
                  <FunnelCard title="Pool — create path" report={data.poolFunnel.create} />
                  <FunnelCard title="Pool — join path" report={data.poolFunnel.join} />
                </>
              ) : (
                <>
                  <MissingCard title="Pool — create path" />
                  <MissingCard title="Pool — join path" />
                </>
              )}
            </div>
          </Section>

          {/* ── Engagement & money ─────────────────────────────────────── */}
          <Section id="engagement" title="Engagement & money" scope={windowLabel}>
            <div className="grid gap-4 lg:grid-cols-4">
              <div className="grid grid-cols-2 gap-4 lg:col-span-1 lg:grid-cols-1">
                <StatTile label="Total transactions" value={data.transactions?.total} />
                <StatTile label="Points cohort" value={data.engagement?.points.totalUsers} />
              </div>
              <ChartCard title="Transactions per day" className="lg:col-span-3">
                <SeriesLineChart
                  data={(data.transactions?.series ?? []).map((p) => ({
                    label: p.date,
                    value: p.count,
                  }))}
                />
              </ChartCard>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <DistributionCard title="Transactions by status" record={data.transactions?.byStatus} />
              {/* Counts only (#24 privacy) — the money-event report carries no amounts. */}
              <DistributionCard
                title="Money events (counts only)"
                record={data.moneyEvents?.totals}
                labelFn={humanizeEnum}
              />
              {data.discoverFunnel ? (
                <FunnelCard title="Discover funnel" report={data.discoverFunnel} />
              ) : (
                <MissingCard title="Discover funnel" />
              )}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Both rendered for the first time — the engagement payload has
                  always carried them; only the cohort size was shown. */}
              <DistributionCard
                title="Points balance distribution"
                entries={bucketsToEntries(data.engagement?.points.buckets)}
                labelFn={bucketLabel}
              />
              <DistributionCard
                title="Current streak distribution"
                entries={bucketsToEntries(data.engagement?.streak.current)}
                labelFn={bucketLabel}
                footer={
                  data.engagement
                    ? `Longest streak on record: ${data.engagement.streak.longestMax} days`
                    : undefined
                }
              />
            </div>
          </Section>

          {/* ── Health ─────────────────────────────────────────────────── */}
          <Section id="health" title="Health" scope="Live — not scoped to the range">
            <HealthCard state={data.alerts} />
          </Section>
        </>
      )}
    </div>
  );
}

// ─── Section chrome ──────────────────────────────────────────────────────────

function Section({
  id,
  title,
  scope,
  children,
}: {
  id: string;
  title: string;
  /** What the panels below are scoped to — the range, or "live". */
  scope: string;
  children: ReactNode;
}) {
  const headingId = `overview-${id}`;
  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
        <h2 id={headingId} className="text-lg font-semibold">
          {title}
        </h2>
        <span className="text-xs text-muted-foreground">{scope}</span>
      </div>
      {children}
    </section>
  );
}

// ─── Panels ──────────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | undefined;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-bold">{value ?? '—'}</div>
        {sub !== undefined && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

function DistributionCard({
  title,
  record,
  entries: orderedEntries,
  labelFn = humanizeEnum,
  footer,
}: {
  title: string;
  /** A categorical record — rendered sorted by count, descending. */
  record?: Record<string, number>;
  /**
   * An ORDERED histogram (`[bucket, count][]`) — rendered in the payload's own
   * order, never re-sorted: "0 · 1–99 · 100–499" is the reading order, and a
   * record would additionally let JS hoist integer-like keys to the front.
   */
  entries?: [string, number][];
  labelFn?: (k: string) => string;
  footer?: string;
}) {
  const entries = orderedEntries ?? Object.entries(record ?? {}).sort((a, b) => b[1] - a[1]);
  return (
    <Card>
      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data</p>
        ) : (
          <div className="space-y-1.5">
            {entries.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{labelFn(k)}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        )}
        {footer && <p className="mt-3 text-xs text-muted-foreground">{footer}</p>}
      </CardContent>
    </Card>
  );
}

function FunnelCard({ title, report }: { title: string; report: FunnelReport }) {
  return (
    <Card>
      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {report.totals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events in this window</p>
        ) : (
          <div className="space-y-1.5">
            {report.totals.map((stage) => (
              <div key={stage.name} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{humanizeEnum(stage.name)}</span>
                <span className="font-medium">
                  {stage.actors} actors
                  <span className="ml-2 text-xs text-muted-foreground">
                    {((report.conversionRates[stage.name] ?? 0) * 100).toFixed(0)}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** A panel whose call failed — keeps the section's shape and says why the slot is empty. */
function MissingCard({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <p className="text-sm text-muted-foreground">Could not load this panel.</p>
      </CardContent>
    </Card>
  );
}

/**
 * The Health section: a one-line-per-alarm summary of the #190 state and a
 * link into Errors & Health. The honesty rules are the Errors page's own —
 * `unknown` is NOT ok, and a failed read never renders "all clear".
 */
function HealthCard({ state }: { state: AdminAlertState | null }) {
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function recordToPoints(
  record: Record<string, number> | undefined,
  labelFn: (k: string) => string,
): ChartPoint[] {
  return Object.entries(record ?? {}).map(([label, value]) => ({ label: labelFn(label), value }));
}

/** A bucketed histogram → ordered `[bucket, count]` pairs, payload order kept. */
function bucketsToEntries(buckets: MetricBucket[] | undefined): [string, number][] | undefined {
  return buckets?.map((b) => [b.bucket, b.count]);
}

/**
 * Bucket keys are already human ("today", "1-7d", "1000+"); only the word
 * form wants a capital. `humanizeEnum` would also lowercase a "d" suffix's
 * neighbours harmlessly, but stating the intent beats relying on that.
 */
function bucketLabel(key: string): string {
  return /^[a-z]/.test(key) ? key.charAt(0).toUpperCase() + key.slice(1) : key;
}
