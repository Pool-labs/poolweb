'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SeriesLineChart, SeriesBarChart, ChartPoint } from '@/components/ui/chart';
import { metricsApi, funnelsApi } from '@/lib/admin/adminApi';
import { humanizeEnum } from '@/lib/admin/format';
import type {
  AdminActivationMetrics,
  AdminActiveUsersMetrics,
  AdminEngagementMetrics,
  AdminPoolMetrics,
  AdminSignupsMetrics,
  AdminTransactionMetrics,
  FunnelReport,
  MoneyEventCountsReport,
  PoolFunnelReport,
} from '@/lib/admin/types';

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
    };
    const allFailed = Object.values(next).every((v) => v === null);
    if (allFailed) setError('Could not load metrics. Check the API connection and try again.');
    setData(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Overview</h1>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-36">
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
          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="DAU" value={data.activeUsers?.dau} />
            <StatTile label="WAU" value={data.activeUsers?.wau} />
            <StatTile label="MAU" value={data.activeUsers?.mau} />
            <StatTile label="Signups (all time)" value={data.signups?.totalAllTime} />
            <StatTile label={`Signups (last ${days}d)`} value={data.signups?.totalInWindow} />
            {/*
             * Activation (#592) sits directly beside signups, same window —
             * server-derived from `users` through the app's own signup
             * predicate, so the auth funnel's client-emitted
             * `onboarding_completed` (below) has something to be checked
             * against. Its window denominator excludes soft-deleted accounts,
             * so it may sit below the signups tile; that is documented on the
             * type, not a bug.
             */}
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
            <StatTile label="Total pools" value={data.pools?.total} />
            <StatTile label="Total transactions" value={data.transactions?.total} />
            <StatTile
              label="Points cohort"
              value={data.engagement?.points.totalUsers}
            />
          </div>

          {/* Time series */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Signups per day">
              <SeriesLineChart
                data={(data.signups?.series ?? []).map((p) => ({ label: p.date, value: p.signups }))}
              />
            </ChartCard>
            <ChartCard title="New pools per day">
              <SeriesLineChart
                data={(data.pools?.newPoolsSeries ?? []).map((p) => ({
                  label: p.date,
                  value: p.count,
                }))}
              />
            </ChartCard>
            <ChartCard title="Transactions per day">
              <SeriesLineChart
                data={(data.transactions?.series ?? []).map((p) => ({
                  label: p.date,
                  value: p.count,
                }))}
              />
            </ChartCard>
            <ChartCard title="Pools by type">
              <SeriesBarChart data={recordToPoints(data.pools?.byType, humanizeEnum)} />
            </ChartCard>
          </div>

          {/* Distributions */}
          <div className="grid gap-4 lg:grid-cols-3">
            <DistributionCard title="Pools by status" record={data.pools?.byStatus} />
            <DistributionCard title="Pools by visibility" record={data.pools?.byVisibility} />
            <DistributionCard title="Transactions by status" record={data.transactions?.byStatus} />
            {/*
             * Where the un-activated are held, by signup requirement (all
             * time). An account blocked on several is counted under each —
             * "how many are held at the Age step" is the answerable question.
             */}
            <DistributionCard
              title="Un-activated — held at (all time)"
              record={data.activation?.blockedByRequirement}
            />
          </div>

          {/* Funnels */}
          <div className="grid gap-4 lg:grid-cols-2">
            {data.authFunnel && <FunnelCard title="Auth funnel" report={data.authFunnel} />}
            {data.discoverFunnel && (
              <FunnelCard title="Discover funnel" report={data.discoverFunnel} />
            )}
            {data.poolFunnel && <FunnelCard title="Pool — create path" report={data.poolFunnel.create} />}
            {data.poolFunnel && <FunnelCard title="Pool — join path" report={data.poolFunnel.join} />}
          </div>

          {data.moneyEvents && (
            <DistributionCard
              title="Money events (counts only)"
              record={data.moneyEvents.totals}
              labelFn={humanizeEnum}
            />
          )}
        </>
      )}
    </div>
  );
}

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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
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
  labelFn = humanizeEnum,
}: {
  title: string;
  record: Record<string, number> | undefined;
  labelFn?: (k: string) => string;
}) {
  const entries = Object.entries(record ?? {}).sort((a, b) => b[1] - a[1]);
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

function recordToPoints(
  record: Record<string, number> | undefined,
  labelFn: (k: string) => string,
): ChartPoint[] {
  return Object.entries(record ?? {}).map(([label, value]) => ({ label: labelFn(label), value }));
}
