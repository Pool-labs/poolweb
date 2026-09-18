'use client';

import {
  ChartCard,
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
import { formatMoney } from '@/lib/admin/format';
import {
  deltaFor,
  moneySeriesToRows,
  recordToEntries,
  recordToRows,
  seriesToRows,
} from '@/lib/admin/stats';
import { SettlementStatus, TransactionStatus } from '@/lib/admin/types';
import type { StatsTabProps } from './types';

/**
 * Money — how much is happening, and now how much MOVED.
 *
 * ⚠️ TWO KINDS OF FIGURE LIVE HERE AND THEY MUST STAY LEGIBLE AS TWO.
 * Everything from `/metrics/transactions` is a ROW COUNT — a PENDING
 * settlement and a CONFIRMED one are one row each — while the volume panels
 * are INTEGER CENTS from `/metrics/money`. They come from two different calls
 * with two different caching rules (poolmobile#647: the money one is
 * deliberately uncached), so a panel can be dark while its neighbour is fine,
 * and every tile says which of the two it is.
 *
 * ⚠️ VOLUME IS AGGREGATE AND ALWAYS WILL BE. No per-person figure and no pool
 * balance appears on this tab; those live on the audited pool-ledger pages,
 * where reading one leaves a record. The one panel still empty by decision is
 * on the Activity tab (poolmobile#648), not here.
 */
/** A cents figure for a tile, or `undefined` so the tile renders `—`. */
const cents = (value: number | undefined): string | undefined =>
  value === undefined ? undefined : formatMoney(value);

export function MoneyTab({ data, days }: StatsTabProps) {
  const { transactions, money, moneyEvents } = data;
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label={`Deposited (last ${days}d)`}
          value={cents(money?.depositedCentsInWindow)}
          delta={deltaFor(money?.depositedCentsInWindow, money?.previousDepositedCentsInWindow)}
          deltaLabel={vsPrevious}
          // ⚠️ The tile's figure is money, so its delta must be too.
          deltaFormat={formatMoney}
          sub="Completed deposits"
        />
        <StatTile
          label={`Spent (last ${days}d)`}
          value={cents(money?.spentCentsInWindow)}
          delta={deltaFor(money?.spentCentsInWindow, money?.previousSpentCentsInWindow)}
          deltaLabel={vsPrevious}
          deltaFormat={formatMoney}
          sub="Logged expenses, removed ones excluded"
        />
        <StatTile
          label={`Net movement (last ${days}d)`}
          value={
            money === null
              ? undefined
              : formatMoney(money.depositedCentsInWindow - money.spentCentsInWindow)
          }
          sub="Deposited minus spent"
        />
        <StatTile
          label="Net adjustments (all time)"
          value={cents(money?.netAdjustmentsCentsAllTime)}
          sub="#106 corrections, signed"
        />
      </div>

      <ChartCard
        title="Money moved per day"
        description={`${windowLabel} — deposits in, expenses out. A day with no movement on either side is absent, not a zero.`}
      >
        <TrendChart
          rows={moneySeriesToRows(money?.series)}
          series={[
            { key: 'deposited', name: 'Deposited', color: seriesColor(0) },
            { key: 'spent', name: 'Spent', color: seriesColor(1) },
          ]}
          yLabel="USD"
          yWidth={64}
          // ⚠️ The rows are INTEGER CENTS; this is the only thing between the
          // reader and an axis reading "12000" for a hundred and twenty dollars.
          valueFormatter={formatMoney}
          emptyReason={money ? 'no-data' : 'unavailable'}
          emptyDetail={
            money
              ? undefined
              : 'The money metric did not answer for this environment. On an API older than poolmobile#647 it does not exist at all — which is not the same as no money having moved.'
          }
        />
      </ChartCard>

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
          title="Net ledger adjustments"
          description="All time (#106) — credits minus debits, the reconciliation term"
        >
          <div className="flex h-[160px] flex-col justify-center gap-2">
            <div className="text-3xl font-bold tabular-nums">
              {money ? formatMoney(money.netAdjustmentsCentsAllTime) : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {money
                ? 'All time, not the selected range — an adjustment is a correction you reconcile against forever, so "the last 30 days of corrections" is not a figure anybody uses. A reversal is its own signed row, so the net already accounts for it.'
                : 'The money metric did not answer for this environment, so this is unread rather than zero.'}
            </p>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
