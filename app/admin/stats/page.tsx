'use client';

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

import { ActivityTab } from '@/components/admin/stats/ActivityTab';
import { EngagementTab } from '@/components/admin/stats/EngagementTab';
import { FunnelsTab } from '@/components/admin/stats/FunnelsTab';
import { GrowthTab } from '@/components/admin/stats/GrowthTab';
import { HealthTab } from '@/components/admin/stats/HealthTab';
import { MoneyTab } from '@/components/admin/stats/MoneyTab';
import { PoolsTab } from '@/components/admin/stats/PoolsTab';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { funnelsApi, metricsApi, observabilityApi } from '@/lib/admin/adminApi';
import { WINDOW_OPTIONS, type StatsData } from '@/lib/admin/stats';
import type { StatsTabProps } from '@/components/admin/stats/types';

/**
 * Stats (poolweb #33) — what the whole site's data looks like.
 *
 * Replaces the Overview, which showed the same figures as one undifferentiated
 * wall of tiles with no shape, no comparison and no geography. Every figure the
 * Overview rendered is still here; what changed is how it is read.
 *
 * ── Three decisions worth knowing before editing ───────────────────────────
 *
 * 1. **ONE FETCH, ONE RANGE, MANY TABS.** Every panel on every tab is fed from
 *    a single `Promise.allSettled` over the same window. A tab that fetched for
 *    itself would let two tabs answer the same question differently, and would
 *    multiply the load on a rate-budgeted admin API by the number of tabs a
 *    founder clicks through. Switching tabs is free; switching the RANGE is the
 *    only thing that re-reads.
 *
 * 2. **FAILURE IS PER PANEL, NEVER PER PAGE.** `allSettled`, not `all`: one
 *    dead endpoint greys one card. The whole-page error card appears only when
 *    EVERY metrics call failed, which is the "wrong API / no session" case and
 *    is worth saying loudly. The #112 switch can point this page at any Pool
 *    API — including one older than #624 — so each panel also distinguishes
 *    "this API does not report that" from "there is nothing in the window".
 *
 * 3. **AN EMPTY PANEL ALWAYS SAYS WHY.** Borrowed from #116: a blank chart that
 *    explains nothing lets "we could not read this" pass for "nothing is
 *    happening", and on a stats page that mistake is silent and permanent. Two
 *    panels here are empty BY DECISION and say so — money volume in cents
 *    (poolmobile#647) and the DAU/WAU/MAU trend (poolmobile#648).
 */

const EMPTY: StatsData = {
  activeUsers: null,
  signups: null,
  activation: null,
  pools: null,
  transactions: null,
  engagement: null,
  points: null,
  authFunnel: null,
  poolFunnel: null,
  discoverFunnel: null,
  moneyEvents: null,
  alerts: null,
};

function pick<T>(r: PromiseSettledResult<T>): T | null {
  return r.status === 'fulfilled' ? r.value : null;
}

interface TabDef {
  value: string;
  label: string;
  /** What the panels under it are scoped to — the range, or something else. */
  scope: (days: number) => string;
  Panel: (props: StatsTabProps) => ReactElement;
}

const windowScope = (days: number) => `Last ${days} days`;

const TABS: TabDef[] = [
  { value: 'growth', label: 'Growth', scope: windowScope, Panel: GrowthTab },
  {
    value: 'activity',
    label: 'Activity',
    scope: () => 'Snapshot — active-user counts have no history to window',
    Panel: ActivityTab,
  },
  { value: 'pools', label: 'Pools', scope: windowScope, Panel: PoolsTab },
  { value: 'money', label: 'Money', scope: windowScope, Panel: MoneyTab },
  {
    value: 'engagement',
    label: 'Engagement',
    // ⚠️ MIXED SCOPE, said out loud. The points LEDGER is windowed; the balance
    // and streak distributions come from `/metrics/engagement`, which takes no
    // `days` at all — so half this tab cannot move when the range does.
    scope: (days) => `Last ${days} days — the balance and streak distributions are a live snapshot`,
    Panel: EngagementTab,
  },
  { value: 'funnels', label: 'Funnels', scope: windowScope, Panel: FunnelsTab },
  {
    value: 'health',
    label: 'Health',
    scope: () => 'Live — not scoped to the range',
    Panel: HealthTab,
  },
];

export default function AdminStatsPage() {
  const [days, setDays] = useState(30);
  /**
   * ⚠️ THE TAB IS CONTROLLED ON PURPOSE. The `<Tabs>` subtree lives inside the
   * loading ternary, so every refresh and every range change unmounts it — with
   * Radix's uncontrolled `defaultValue` that silently threw the reader back to
   * Growth each time, which is maddening precisely when someone is comparing
   * two ranges on the Money tab.
   */
  const [tab, setTab] = useState<string>(TABS[0].value);
  const [data, setData] = useState<StatsData>(EMPTY);
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
      points,
      authFunnel,
      poolFunnel,
      discoverFunnel,
      moneyEvents,
      alerts,
    ] = await Promise.allSettled([
      metricsApi.activeUsers(windowDays),
      metricsApi.signups(windowDays),
      // Same window as signups on purpose (#592): the two answer the same
      // question from two sources, and only a shared window makes a divergence
      // between them mean something (a telemetry outage).
      metricsApi.activation(windowDays),
      metricsApi.pools(windowDays),
      metricsApi.transactions(windowDays),
      metricsApi.engagement(windowDays),
      metricsApi.points(windowDays),
      funnelsApi.auth(windowDays),
      funnelsApi.pool(windowDays),
      funnelsApi.discover(windowDays),
      funnelsApi.moneyEvents(windowDays),
      // Live, un-windowed: the Health tab's source (#190).
      observabilityApi.alerts(),
    ]);

    const next: StatsData = {
      activeUsers: pick(activeUsers),
      signups: pick(signups),
      activation: pick(activation),
      pools: pick(pools),
      transactions: pick(transactions),
      engagement: pick(engagement),
      points: pick(points),
      authFunnel: pick(authFunnel),
      poolFunnel: pick(poolFunnel),
      discoverFunnel: pick(discoverFunnel),
      moneyEvents: pick(moneyEvents),
      alerts: pick(alerts),
    };
    // The metrics calls decide the page's fate; the alerts read never does — a
    // health panel that cannot load says so in its own card.
    const { alerts: _alerts, ...metricsOnly } = next;
    const allFailed = Object.values(metricsOnly).every((v) => v === null);
    if (allFailed) setError('Could not load metrics. Check the API connection and try again.');
    setData(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-foreground">Stats</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load(days)}
            disabled={loading}
            aria-label="Refresh"
          >
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-36 text-foreground" aria-label="Date range">
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
        <Tabs value={tab} onValueChange={setTab} className="space-y-3">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map(({ value, label, scope, Panel }) => (
            <TabsContent key={value} value={value} className="space-y-3">
              {/*
                Each tab is a landmark named by its own heading, and states what
                its panels are scoped to — three of the seven are not (or not
                fully) scoped by the range control, and a reader who assumes
                otherwise misreads every number under them.
              */}
              <section aria-labelledby={`stats-${value}`} className="space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
                  <h2 id={`stats-${value}`} className="text-lg font-semibold text-foreground">
                    {label}
                  </h2>
                  <span className="text-xs text-muted-foreground">{scope(days)}</span>
                </div>
                <Panel data={data} days={days} />
              </section>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
