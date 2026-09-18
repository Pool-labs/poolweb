'use client';

import {
  ChartCard,
  CumulativeAreaChart,
  DistributionBarChart,
  DistributionList,
  StatTile,
  TrendChart,
} from '@/components/admin/charts';
import { previousWindowLabel, seriesColor } from '@/lib/admin/charts';
import { deltaFor, formatRate, recordToRows } from '@/lib/admin/stats';
import type { StatsTabProps } from './types';

/**
 * Growth — how many people arrive, and how many of them finish arriving.
 *
 * Signups and activation share the window deliberately (#592): the two answer
 * the same question from two sources — one derived from `users`, one from
 * client analytics — and only a shared window makes a divergence between them
 * mean something (a telemetry outage rather than a drop in signups).
 */
export function GrowthTab({ data, days }: StatsTabProps) {
  const { signups, activation } = data;
  const windowLabel = `Last ${days} days`;
  const vsPrevious = previousWindowLabel(days);

  const signupRows = (signups?.series ?? []).map((p) => ({
    label: p.date,
    value: p.signups,
    cumulative: p.cumulative,
  }));

  /**
   * Where the un-activated are held, by signup requirement. An account blocked
   * on several is counted under each — "how many are held at the Age step" is
   * the answerable question, not "how many are held ONLY there", and the panel
   * says so rather than letting the bars imply a partition.
   */
  const blockedRows = recordToRows(activation?.blockedByRequirement);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label={`Signups (last ${days}d)`}
          value={signups?.totalInWindow}
          delta={deltaFor(signups?.totalInWindow, signups?.previousTotalInWindow)}
          deltaLabel={vsPrevious}
        />
        <StatTile label="Signups (all time)" value={signups?.totalAllTime} />
        <StatTile
          label={`Activated (last ${days}d)`}
          value={activation?.activatedInWindow}
          delta={deltaFor(activation?.activatedInWindow, activation?.previousActivatedInWindow)}
          deltaLabel={vsPrevious}
          sub={
            activation
              ? `${formatRate(activation.activationRateInWindow)} of ${activation.signupsInWindow} window signups`
              : undefined
          }
        />
        <StatTile
          label="Activated (all time)"
          value={activation?.activatedAllTime}
          sub={
            activation
              ? `${formatRate(activation.activationRateAllTime)} of ${activation.totalUsers} accounts`
              : undefined
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Signups per day" description={windowLabel}>
          <TrendChart
            rows={signupRows}
            series={[{ key: 'value', name: 'Signups', color: seriesColor(0) }]}
            yLabel="Accounts"
            emptyReason={signups ? 'no-data' : 'unavailable'}
            emptyDetail={
              signups ? undefined : 'The signups metric did not answer for this environment.'
            }
          />
        </ChartCard>

        <ChartCard
          title="Cumulative accounts"
          description={`Running total inside the ${windowLabel.toLowerCase()} — not the all-time count`}
        >
          <CumulativeAreaChart
            rows={signupRows}
            series={{ key: 'cumulative', name: 'Accounts to date', color: seriesColor(0) }}
            yLabel="Accounts"
            emptyReason={signups ? 'no-data' : 'unavailable'}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Un-activated — held at"
          description="All time, by signup requirement. An account blocked on several requirements is counted under each, so these bars do not sum to the un-activated total."
        >
          <DistributionBarChart
            rows={blockedRows}
            yLabel="Accounts"
            emptyReason={activation ? 'no-data' : 'unavailable'}
            emptyDetail={
              activation
                ? 'Every account has cleared its signup requirements.'
                : 'The activation metric did not answer for this environment.'
            }
          />
        </ChartCard>

        <ChartCard
          title="Activation rate"
          description={`This window against the ${days} days before it. The previous window's cohort is judged NOW — activation is a property of an account's current state, not a timestamp.`}
        >
          <DistributionList
            entries={
              activation
                ? ([
                    [`This window (${activation.signupsInWindow} signups)`, activation.activatedInWindow],
                    activation.previousSignupsInWindow !== undefined &&
                    activation.previousActivatedInWindow !== undefined
                      ? [
                          `Previous window (${activation.previousSignupsInWindow} signups)`,
                          activation.previousActivatedInWindow,
                        ]
                      : null,
                    ['Activated, all time', activation.activatedAllTime],
                    ['Accounts, all time', activation.totalUsers],
                  ].filter(Boolean) as [string, number][])
                : []
            }
            emptyReason={activation ? 'no-data' : 'unavailable'}
            footer={
              activation
                ? `Rate this window ${formatRate(activation.activationRateInWindow)}${
                    activation.previousActivationRateInWindow !== undefined
                      ? ` · previous window ${formatRate(activation.previousActivationRateInWindow)}`
                      : ''
                  }`
                : undefined
            }
          />
        </ChartCard>
      </div>
    </div>
  );
}
