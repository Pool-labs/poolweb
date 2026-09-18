/**
 * Pure shaping helpers for the Stats page (poolweb #33).
 *
 * Everything here is a total function of a payload — no fetching, no React —
 * so the page's reading of the API is unit-testable without a browser, and the
 * awkward cases (a bucket list vs a record, a delta with no previous window, a
 * zero denominator) are decided ONCE instead of per panel.
 */

import { computeDelta, type WindowDelta } from './charts';
import { humanizeEnum } from './format';
import type {
  AdminActivationMetrics,
  AdminActiveUsersMetrics,
  AdminAlertState,
  AdminEngagementMetrics,
  AdminPointsMetrics,
  AdminPoolMetrics,
  AdminSignupsMetrics,
  AdminTransactionMetrics,
  FunnelReport,
  MetricBucket,
  MoneyEventCountsReport,
  PoolFunnelReport,
  TimeSeriesPoint,
} from './types';

/** Every payload the Stats page loads. `null` = that one call failed. */
export interface StatsData {
  activeUsers: AdminActiveUsersMetrics | null;
  signups: AdminSignupsMetrics | null;
  activation: AdminActivationMetrics | null;
  pools: AdminPoolMetrics | null;
  transactions: AdminTransactionMetrics | null;
  engagement: AdminEngagementMetrics | null;
  points: AdminPointsMetrics | null;
  authFunnel: FunnelReport | null;
  poolFunnel: PoolFunnelReport | null;
  discoverFunnel: FunnelReport | null;
  moneyEvents: MoneyEventCountsReport | null;
  alerts: AdminAlertState | null;
}

/** The range options, shared by the control and the labels it drives. */
export const WINDOW_OPTIONS = [7, 30, 90] as const;

/** A chart row: a label plus one or more numeric keys. */
export interface LabelledRow {
  label: string;
  value: number;
  [key: string]: string | number;
}

/**
 * A delta, or `undefined` when the API did not report the previous window.
 *
 * ⚠️ `undefined` IS THE POINT. A missing previous-window twin means this API
 * version predates #624 — not that nothing changed — so the tile must show no
 * delta rather than a computed-from-zero one that reads as a real measurement.
 */
export function deltaFor(
  current: number | undefined,
  previous: number | undefined,
): WindowDelta | undefined {
  if (current === undefined || previous === undefined) return undefined;
  return computeDelta(current, previous);
}

/**
 * A bucketed histogram → rows, in the PAYLOAD'S OWN ORDER.
 *
 * Never re-sorted: "0 · 1–99 · 100–499" is the reading order, and these are
 * ordinal buckets where size-sorting would destroy the meaning.
 */
export function bucketsToRows(buckets: MetricBucket[] | undefined): LabelledRow[] {
  return (buckets ?? []).map((b) => ({ label: bucketLabel(b.bucket), value: b.count }));
}

/** Same, as `[label, count]` pairs for the list form. */
export function bucketsToEntries(buckets: MetricBucket[] | undefined): [string, number][] {
  return (buckets ?? []).map((b) => [bucketLabel(b.bucket), b.count]);
}

/**
 * A categorical record → rows, largest first.
 *
 * Sorting by size is right here and wrong for buckets: these keys have no
 * inherent order, so the reader's question is "which is biggest". Ties break on
 * the key so the order is stable between reloads.
 */
export function recordToRows(
  record: Record<string, number> | undefined,
  labelFn: (key: string) => string = humanizeEnum,
): LabelledRow[] {
  return Object.entries(record ?? {})
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, value]) => ({ label: labelFn(key), value, key }));
}

/** Same, as `[label, count]` pairs. */
export function recordToEntries(
  record: Record<string, number> | undefined,
  labelFn: (key: string) => string = humanizeEnum,
): [string, number][] {
  return recordToRows(record, labelFn).map((r) => [r.label, r.value]);
}

/** A `{ date, count }` series → chart rows. */
export function seriesToRows(series: TimeSeriesPoint[] | undefined): LabelledRow[] {
  return (series ?? []).map((p) => ({ label: p.date, value: p.count }));
}

/**
 * The top N rows plus an explicit "Other (n more)" row for the tail.
 *
 * ⚠️ A tail that HOLDS ANYTHING is never dropped silently — a top-16 chart that
 * quietly discards a 17th category with rows in it makes the visible bars look
 * like the whole population. An all-zero tail IS omitted: the server seeds every
 * `PoolCategory` to zero, so without this every payload would carry a permanent
 * "Other (1 more): 0" row, which is noise dressed as information.
 */
export function topNWithOther(rows: LabelledRow[], n: number): LabelledRow[] {
  if (rows.length <= n) return rows;
  const head = rows.slice(0, n);
  const tail = rows.slice(n);
  const rest = tail.reduce((sum, r) => sum + r.value, 0);
  if (rest === 0) return head;
  return [...head, { label: `Other (${tail.length} more)`, value: rest }];
}

/** A funnel report → the step bars, in the report's own stage order. */
export function funnelSteps(
  report: FunnelReport | null,
): { name: string; actors: number; conversion: number }[] {
  if (!report) return [];
  return report.totals.map((stage) => ({
    name: humanizeEnum(stage.name),
    actors: stage.actors,
    conversion: report.conversionRates[stage.name] ?? 0,
  }));
}

/** A 0–1 rate as a whole-number percentage. */
export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

/**
 * "Stickiness" — DAU/MAU, the share of the monthly base that shows up daily.
 * Null when MAU is 0: a ratio over an empty base is not 0%, it is unanswerable.
 */
export function stickiness(active: AdminActiveUsersMetrics | null): number | null {
  if (!active || active.mau === 0) return null;
  return active.dau / active.mau;
}

/**
 * Bucket keys arrive already human ("today", "1-7d", "1000+"); only the word
 * forms want a capital. `humanizeEnum` would lowercase "1000+"'s neighbours
 * harmlessly, but stating the intent beats relying on that.
 */
export function bucketLabel(key: string): string {
  return /^[a-z]/.test(key) ? key.charAt(0).toUpperCase() + key.slice(1) : key;
}

/** `uncategorized` is the absence of a choice — not the `Other` category. */
export function poolCategoryLabel(key: string): string {
  return key === 'uncategorized' ? 'No category set' : humanizeEnum(key);
}

/** Every pool-metrics distribution, as one helper the Pools tab reads. */
export function poolStatusEntries(pools: AdminPoolMetrics | null): [string, number][] {
  return recordToEntries(pools?.byStatus);
}

/** Total points awarded across every reason, for the Engagement headline. */
export function pointsAwardRows(points: AdminPointsMetrics | null): LabelledRow[] {
  return (points?.byReason ?? []).map((r) => ({
    label: humanizeEnum(r.reason),
    value: r.points,
    awards: r.awards,
    earners: r.distinctEarners,
  }));
}

/**
 * Engagement is a SNAPSHOT of the live user base, not a window — say so rather
 * than let a range control imply it filtered something.
 */
export const SNAPSHOT_SCOPE = 'Snapshot — the whole user base, not the range';
