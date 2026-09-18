'use client';

import {
  ChartCard,
  ChartEmpty,
  DistributionList,
  SplitDonutChart,
  StatTile,
  TrendChart,
} from '@/components/admin/charts';
import {
  SETTLEMENT_STATUS_COLOR,
  TRANSACTION_STATUS_COLOR,
  categoryColor,
  previousWindowLabel,
  seriesColor,
} from '@/lib/admin/charts';
import { humanizeEnum } from '@/lib/admin/format';
import { deltaFor, recordToEntries, recordToRows, seriesToRows } from '@/lib/admin/stats';
import { SettlementStatus, TransactionStatus } from '@/lib/admin/types';
import type { StatsTabProps } from './types';

/**
 * Money — how much is HAPPENING, never how much money there is.
 *
 * ⚠️ THERE ARE NO CENTS ON THIS TAB, AND THAT IS A DECISION, NOT A GAP.
 * Aggregate volume in cents is out by founder decision D1 (poolmobile#647):
 * it would make this the first cached admin response to carry money, which
 * needs its own review first. So every figure here is a ROW COUNT — a PENDING
 * settlement and a CONFIRMED one are one row each — and the panel that would
 * have held the volume says why it is empty instead of quietly not existing.
 */
export function MoneyTab({ data, days }: StatsTabProps) {
  const { transactions, moneyEvents } = data;
  const windowLabel = `Last ${days} days`;
  const vsPrevious = previousWindowLabel(days);

  const settlementRows = recordToRows(transactions?.settlementsByStatus);
  const settlementColors = Object.fromEntries(
    Object.values(SettlementStatus).map((s) => [
      humanizeEnum(s),
      categoryColor(s, SETTLEMENT_STATUS_COLOR, Object.values(SettlementStatus)),
    ]),
  );
  const transactionStatusRows = recordToRows(transactions?.byStatus);
  // ⚠️ The domain is the ENUM, never the rows' own (count-sorted) order: a
  // status whose count moves must not repaint the others.
  const transactionStatusColors = Object.fromEntries(
    Object.values(TransactionStatus).map((t) => [
      humanizeEnum(t),
      categoryColor(t, TRANSACTION_STATUS_COLOR, Object.values(TransactionStatus)),
    ]),
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Transactions (all time)" value={transactions?.total} />
        <StatTile
          label={`Transactions (last ${days}d)`}
          value={transactions?.totalInWindow}
          delta={deltaFor(transactions?.totalInWindow, transactions?.previousTotalInWindow)}
          deltaLabel={vsPrevious}
        />
        <StatTile
          label={`Deposits (last ${days}d)`}
          value={transactions?.depositsInWindow}
          delta={deltaFor(transactions?.depositsInWindow, transactions?.previousDepositsInWindow)}
          deltaLabel={vsPrevious}
          sub="Completed deposit rows"
        />
        <StatTile
          label={`Settlements (last ${days}d)`}
          value={transactions?.settlementsInWindow}
          delta={deltaFor(
            transactions?.settlementsInWindow,
            transactions?.previousSettlementsInWindow,
          )}
          deltaLabel={vsPrevious}
          sub="Any status"
        />
      </div>

      <ChartCard title="Transactions per day" description={windowLabel}>
        <TrendChart
          rows={seriesToRows(transactions?.series)}
          series={[{ key: 'value', name: 'Transactions', color: seriesColor(0) }]}
          yLabel="Rows"
          emptyReason={transactions ? 'no-data' : 'unavailable'}
          emptyDetail={
            transactions ? undefined : 'The transactions metric did not answer for this environment.'
          }
        />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Settlements by status"
          description="All time (#38). A row each — a PENDING attestation and a CONFIRMED one both count once."
        >
          <SplitDonutChart
            rows={settlementRows}
            colors={settlementColors}
            emptyReason={
              transactions ? (transactions.settlementsByStatus ? 'none-yet' : 'unavailable') : 'unavailable'
            }
            emptyDetail={
              transactions && !transactions.settlementsByStatus
                ? 'This API version does not report settlements.'
                : undefined
            }
          />
        </ChartCard>

        <ChartCard title="Transactions by status" description="All time">
          <SplitDonutChart
            rows={transactionStatusRows}
            colors={transactionStatusColors}
            emptyReason={transactions ? 'none-yet' : 'unavailable'}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Money events"
          description={`${windowLabel} — client-emitted event COUNTS (#24 strips amounts at ingest, so there is nothing to sum here even in principle)`}
        >
          <DistributionList
            entries={recordToEntries(moneyEvents?.totals)}
            emptyReason={moneyEvents ? 'no-data' : 'unavailable'}
            emptyDetail={
              moneyEvents ? undefined : 'The money-events report did not answer for this environment.'
            }
          />
        </ChartCard>

        <ChartCard
          title="Volume in cents"
          description="Deposits vs spend, and the #106 adjustments total"
        >
          <ChartEmpty
            reason="not-servable"
            detail={
              'Aggregate money volume is deliberately not served. It would be the first cached admin response to carry cents, which needs its own privacy/caching review — founder decision D1, tracked as poolmobile#647. Per-pool balances stay on the audited pool ledger, where they already are.'
            }
            height={160}
          />
        </ChartCard>
      </div>
    </div>
  );
}
