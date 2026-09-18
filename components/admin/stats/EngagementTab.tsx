'use client';

import {
  ChartCard,
  ChartEmpty,
  DistributionBarChart,
  HorizontalBarChart,
  StatTile,
} from '@/components/admin/charts';
import Link from 'next/link';

import { previousWindowLabel } from '@/lib/admin/charts';
import { humanizeEnum } from '@/lib/admin/format';
import {
  bucketsToRows,
  deltaFor,
  formatRate,
  LEADERBOARD_BOARD_COPY,
  pointsAwardRows,
  SNAPSHOT_SCOPE,
} from '@/lib/admin/stats';
import type { StatsTabProps } from './types';

/**
 * Engagement — the Pool Points economy and the streaks it is meant to create.
 *
 * The distributions are a SNAPSHOT of the live user base (one mutable balance
 * per account); the award figures are windowed, from the points LEDGER. Two
 * different scopes on one tab, so each panel states its own.
 */
export function EngagementTab({ data, days }: StatsTabProps) {
  const { engagement, points } = data;
  const vsPrevious = previousWindowLabel(days);
  const awardRows = pointsAwardRows(points);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Points cohort"
          value={engagement?.points.totalUsers}
          // ⚠️ ALL TIME, under a header that names a range. The engagement
          // endpoint takes no `days` — it reads one mutable balance per account
          // — so this tile cannot move when the range does, and a reader who
          // assumes otherwise reads it as "earned points this window".
          sub="All time — accounts that hold a balance, not this window"
        />
        <StatTile
          label={`Points awarded (last ${days}d)`}
          value={points?.totals.points}
          delta={deltaFor(points?.totals.points, points?.previousTotals?.points)}
          deltaLabel={vsPrevious}
        />
        <StatTile
          label={`Earners (last ${days}d)`}
          value={points?.totals.distinctEarners}
          delta={deltaFor(points?.totals.distinctEarners, points?.previousTotals?.distinctEarners)}
          deltaLabel={vsPrevious}
          sub="Distinct accounts that earned"
        />
        <StatTile
          label="Daily-cap hit rate"
          value={points ? formatRate(points.daily.grindableCapHitRate) : undefined}
          sub={
            points
              ? `Of ${points.daily.earnerDays.toLocaleString('en-US')} earner-days. Not near zero means the cap is shaping behaviour.`
              : undefined
          }
        />
      </div>

      <ChartCard
        title="Points awarded by earning rule"
        description={`Last ${days} days, from the points ledger. A rule sitting at zero is a rule nobody reaches — since #624 those are reported as zero rows rather than left out.`}
      >
        <HorizontalBarChart
          rows={awardRows}
          xLabel="Points awarded"
          valueName="Points"
          labelWidth={170}
          emptyReason={points ? 'no-data' : 'unavailable'}
          emptyDetail={
            points ? undefined : 'The points metric did not answer for this environment.'
          }
        />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Points balance distribution" description={SNAPSHOT_SCOPE}>
          <DistributionBarChart
            rows={bucketsToRows(engagement?.points.buckets)}
            xLabel="Balance"
            yLabel="Accounts"
            emptyReason={engagement ? 'no-data' : 'unavailable'}
            emptyDetail={
              engagement ? undefined : 'The engagement metric did not answer for this environment.'
            }
          />
        </ChartCard>

        <ChartCard
          title="Current streak distribution"
          description={SNAPSHOT_SCOPE}
          aside={
            engagement ? (
              <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                Longest on record: {engagement.streak.longestMax} days
              </span>
            ) : undefined
          }
        >
          <DistributionBarChart
            rows={bucketsToRows(engagement?.streak.current)}
            xLabel="Streak"
            yLabel="Accounts"
            emptyReason={engagement ? 'no-data' : 'unavailable'}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Earning spread"
          description={`Points per earning user per day, last ${days} days`}
        >
          {points ? (
            <div className="grid grid-cols-2 gap-4">
              <StatTile label="Median" value={points.daily.medianPerEarnerPerDay} />
              <StatTile label="p90" value={points.daily.p90PerEarnerPerDay} />
            </div>
          ) : (
            <ChartEmpty reason="unavailable" height={120} />
          )}
        </ChartCard>

        <ChartCard
          title="Leaderboard headline"
          description={
            data.leaderboards
              ? `Which pool is #1 on each board — ${data.leaderboards.period} boards`
              : 'Which pool is #1 on each board'
          }
        >
          {!data.leaderboards ? (
            <ChartEmpty
              reason="unavailable"
              detail="The leaderboards metric did not answer for this environment."
              height={160}
            />
          ) : (
            <ul className="space-y-2">
              {data.leaderboards.boards.map((headline) => {
                const copy = LEADERBOARD_BOARD_COPY[headline.board];
                return (
                  <li
                    key={headline.board}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {copy?.label ?? humanizeEnum(headline.board)}
                    </span>
                    {headline.poolId === null ? (
                      /* ⚠️ An EMPTY board, which the server reports rather than
                         omitting. Not the same fact as a pool scoring zero, and
                         it must not read like one. */
                      <span className="text-xs italic text-muted-foreground">
                        No pool qualifies yet
                      </span>
                    ) : (
                      <span className="flex items-baseline gap-2">
                        <Link
                          href={`/admin/pools/${headline.poolId}`}
                          className="font-medium underline underline-offset-2"
                        >
                          {headline.poolName ?? headline.poolId}
                        </Link>
                        {headline.value !== null && (
                          // The unit is part of the fact: `value` counts
                          // expenses on one board and DAYS on another.
                          <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                            {headline.value.toLocaleString('en-US')} {copy?.unit ?? ''}
                          </span>
                        )}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
