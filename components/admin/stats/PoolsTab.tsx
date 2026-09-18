'use client';

import {
  ChartCard,
  DistributionBarChart,
  HorizontalBarChart,
  SplitDonutChart,
  StatTile,
  TrendChart,
} from '@/components/admin/charts';
import {
  POOL_STATUS_COLOR,
  POOL_VISIBILITY_COLOR,
  categoryColor,
  chartColor,
  previousWindowLabel,
  seriesColor,
} from '@/lib/admin/charts';
import { humanizeEnum } from '@/lib/admin/format';
import {
  bucketsToRows,
  deltaFor,
  poolCategoryLabel,
  recordToRows,
  seriesToRows,
  topNWithOther,
} from '@/lib/admin/stats';
import { PoolStatus, PoolVisibility } from '@/lib/admin/types';
import type { StatsTabProps } from './types';

/** The issue's own cap for the category bar — the tail folds into one row. */
const CATEGORY_ROWS = 16;

/**
 * Pools — how many exist, what kind they are, and who can see them.
 *
 * ⚠️ `Suspended` DOES NOT SUM WITH THE STATUS DONUT. It is the one figure on
 * this page that counts soft-deleted pools (the #83 admin suspend); every other
 * distribution here excludes them. Two figures over two populations look like
 * an arithmetic bug unless the panel says which is which, so it does.
 */
export function PoolsTab({ data, days }: StatsTabProps) {
  const { pools } = data;
  const windowLabel = `Last ${days} days`;
  const vsPrevious = previousWindowLabel(days);

  const statusRows = recordToRows(pools?.byStatus);
  const statusColors = Object.fromEntries(
    Object.values(PoolStatus).map((s) => [
      humanizeEnum(s),
      categoryColor(s, POOL_STATUS_COLOR, Object.values(PoolStatus)),
    ]),
  );
  const visibilityColors = Object.fromEntries(
    Object.values(PoolVisibility).map((v) => [
      humanizeEnum(v),
      categoryColor(v, POOL_VISIBILITY_COLOR, Object.values(PoolVisibility)),
    ]),
  );

  const categoryRows = topNWithOther(
    recordToRows(pools?.byCategory, poolCategoryLabel),
    CATEGORY_ROWS,
  );

  const visibilitySeriesRows = (pools?.newPoolsByVisibilitySeries ?? []).map((p) => ({
    label: p.date,
    value: p.public + p.private,
    public: p.public,
    private: p.private,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Total pools" value={pools?.total} sub="Excludes suspended pools" />
        <StatTile
          label={`New pools (last ${days}d)`}
          value={pools?.newInWindow}
          delta={deltaFor(pools?.newInWindow, pools?.previousNewInWindow)}
          deltaLabel={vsPrevious}
        />
        <StatTile
          label="Suspended pools"
          value={pools?.suspended}
          sub="Counted separately — every other panel here excludes them"
        />
      </div>

      <ChartCard title="New pools per day" description={windowLabel}>
        <TrendChart
          rows={seriesToRows(pools?.newPoolsSeries)}
          series={[{ key: 'value', name: 'New pools', color: seriesColor(0) }]}
          yLabel="Pools"
          emptyReason={pools ? 'no-data' : 'unavailable'}
          emptyDetail={pools ? undefined : 'The pools metric did not answer for this environment.'}
        />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Pools by status" description="Excludes suspended pools">
          <SplitDonutChart
            rows={statusRows}
            colors={statusColors}
            emptyReason={pools ? 'none-yet' : 'unavailable'}
          />
        </ChartCard>
        <ChartCard title="Pools by visibility" description="Excludes suspended pools">
          <SplitDonutChart
            rows={recordToRows(pools?.byVisibility)}
            colors={visibilityColors}
            emptyReason={pools ? 'none-yet' : 'unavailable'}
          />
        </ChartCard>
      </div>

      <ChartCard
        title="Public vs private, per day"
        description={`${windowLabel} — the share of new pools that are discoverable`}
      >
        <DistributionBarChart
          rows={visibilitySeriesRows}
          stacked
          series={[
            { key: 'public', name: 'Public', color: POOL_VISIBILITY_COLOR.PUBLIC },
            { key: 'private', name: 'Private', color: POOL_VISIBILITY_COLOR.PRIVATE },
          ]}
          yLabel="New pools"
          emptyReason={pools ? (pools.newPoolsByVisibilitySeries ? 'no-data' : 'unavailable') : 'unavailable'}
          emptyDetail={
            pools && !pools.newPoolsByVisibilitySeries
              ? 'This API version does not report the public/private split of new pools.'
              : undefined
          }
        />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Pools by category"
          description={`What pools are FOR (#236). Top ${CATEGORY_ROWS}; anything past that is summed into one row rather than dropped.`}
        >
          <HorizontalBarChart
            rows={categoryRows}
            xLabel="Pools"
            valueName="Pools"
            labelWidth={150}
            emptyReason={pools ? (pools.byCategory ? 'no-data' : 'unavailable') : 'unavailable'}
            emptyDetail={
              pools && !pools.byCategory
                ? 'This API version does not report pool categories.'
                : undefined
            }
          />
        </ChartCard>

        <ChartCard
          title="Pools by size"
          description="Active members per pool. A pool whose last member left keeps its row, so `No members` is a real bucket, not an error."
        >
          <DistributionBarChart
            rows={bucketsToRows(pools?.byMemberCount)}
            xLabel="Members"
            yLabel="Pools"
            emptyReason={pools ? (pools.byMemberCount ? 'no-data' : 'unavailable') : 'unavailable'}
            emptyDetail={
              pools && !pools.byMemberCount
                ? 'This API version does not report the size distribution.'
                : undefined
            }
          />
        </ChartCard>
      </div>

      <ChartCard title="Pools by type" description="The legacy `type` column, kept from the Overview">
        <HorizontalBarChart
          rows={recordToRows(pools?.byType)}
          xLabel="Pools"
          valueName="Pools"
          color={chartColor('series-3')}
          emptyReason={pools ? 'none-yet' : 'unavailable'}
        />
      </ChartCard>
    </div>
  );
}
