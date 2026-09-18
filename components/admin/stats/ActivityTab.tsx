'use client';

import { ChartCard, ChartEmpty, DistributionBarChart, StatTile } from '@/components/admin/charts';
import { bucketsToRows, formatRate, SNAPSHOT_SCOPE, stickiness } from '@/lib/admin/stats';
import type { StatsTabProps } from './types';

/**
 * Activity — who is actually here.
 *
 * ⚠️ THESE ARE SNAPSHOTS, NOT A TREND, AND THE PANEL SAYS SO. DAU/WAU/MAU are
 * derived from `lastActivityAt`, a single mutable column: it holds one instant
 * per account, so there is no history to plot and a "DAU over time" line would
 * have to be invented. The trend is tracked as poolmobile#648 (it needs an
 * event-derived source); until then the honest render is today's three numbers
 * plus the recency histogram that shows the same shape a different way.
 */
export function ActivityTab({ data }: StatsTabProps) {
  const { activeUsers } = data;
  const sticky = stickiness(activeUsers);

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
        description="The three tiles above, as a trend"
      >
        <ChartEmpty
          reason="not-servable"
          detail={
            'Active-user counts come from one mutable column per account (`lastActivityAt`), which holds a single instant — so the API has no history to return and this chart would have to invent one. Tracked as poolmobile#648; the snapshot tiles above are the real figures today.'
          }
          height={160}
        />
      </ChartCard>
    </div>
  );
}
