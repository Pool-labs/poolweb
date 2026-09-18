'use client';

import {
  ChartCard,
  DistributionBarChart,
  StatTile,
  TrendChart,
} from '@/components/admin/charts';
import { seriesColor } from '@/lib/admin/charts';
import {
  activeUserTrendToRows,
  bucketsToRows,
  formatRate,
  SNAPSHOT_SCOPE,
  stickiness,
  trendCoverageNote,
} from '@/lib/admin/stats';
import type { StatsTabProps } from './types';

/**
 * Activity — who is actually here.
 *
 * ⚠️ TWO DIFFERENT KINDS OF FIGURE SIT HERE, AND THEY MUST STAY LEGIBLE AS TWO.
 * The tiles are a LIVE SNAPSHOT — DAU/WAU/MAU read from `lastActivityAt` right
 * now. The trend is CAPTURED HISTORY: `lastActivityAt` is a single mutable
 * column overwritten in place, so the server cannot look back at it, and a
 * nightly job stores the same computation each day (poolmobile#648). They agree
 * because the job stores exactly what the tile computes.
 *
 * ⚠️ AND THE TREND CANNOT BE BACKFILLED, WHICH IS WHY THE PANEL TALKS ABOUT
 * ITSELF. A short line is the normal state for a young series and is visually
 * identical to a collapse; a gap is the capture job having failed, and is
 * unrecoverable. `trendCoverageNote` turns the API's three honesty fields into
 * the one sentence that tells those apart. Never render this chart without it.
 */
export function ActivityTab({ data, days }: StatsTabProps) {
  const { activeUsers, activeUserTrend } = data;
  const sticky = stickiness(activeUsers);
  const coverage = trendCoverageNote(activeUserTrend, days);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="DAU" value={activeUsers?.dau} sub="Active in the last 24 hours" />
        <StatTile label="WAU" value={activeUsers?.wau} sub="Active in the last 7 days" />
        <StatTile label="MAU" value={activeUsers?.mau} sub="Active in the last 30 days" />
        <StatTile
          label="Stickiness (DAU/MAU)"
          value={sticky === null ? undefined : formatRate(sticky)}
          sub={
            sticky === null
              ? 'No monthly-active base to divide by'
              : 'Share of the monthly base here on a given day'
          }
        />
      </div>

      <ChartCard
        title="Accounts by last seen"
        description={SNAPSHOT_SCOPE}
        aside={
          <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
            {activeUsers ? `As of ${new Date(activeUsers.asOf).toLocaleString('en-US')}` : 'Not read'}
          </span>
        }
      >
        <DistributionBarChart
          rows={bucketsToRows(activeUsers?.lastSeenDistribution)}
          xLabel="Time since last activity"
          yLabel="Accounts"
          emptyReason={activeUsers ? 'no-data' : 'unavailable'}
          emptyDetail={
            activeUsers ? undefined : 'The active-users metric did not answer for this environment.'
          }
        />
      </ChartCard>

      <ChartCard
        title="DAU / WAU / MAU over time"
        description="The three tiles above, captured nightly. The windows overlap — every daily-active account is also weekly- and monthly-active."
      >
        <TrendChart
          rows={activeUserTrendToRows(activeUserTrend?.series)}
          series={[
            { key: 'dau', name: 'DAU', color: seriesColor(0) },
            { key: 'wau', name: 'WAU', color: seriesColor(1) },
            { key: 'mau', name: 'MAU', color: seriesColor(2) },
          ]}
          yLabel="Accounts"
          emptyReason={activeUserTrend ? 'none-yet' : 'unavailable'}
          emptyDetail={
            activeUserTrend
              ? 'Nothing has been captured yet. This series starts the first time the nightly capture runs — it cannot be backfilled, because the figure it records is overwritten each day.'
              : 'The trend metric did not answer for this environment. On an API older than poolmobile#648 it does not exist at all — which is not the same as nobody being active.'
          }
        />
        {coverage && (
          // ⚠️ NOT decoration. Without this, a two-point line and a platform
          // that lost all its users render identically.
          <p className="mt-3 text-xs text-muted-foreground">{coverage}</p>
        )}
      </ChartCard>
    </div>
  );
}
