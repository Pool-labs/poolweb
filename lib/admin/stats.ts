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
import { countryDisplayName } from './cityKey';
import { GlobalLeaderboardBoard, LeaderboardPeriod } from './types';
import type {
  AdminActivationMetrics,
  AdminGeographyCity,
  AdminGeographyCountry,
  AdminGeographyMetrics,
  AdminGeographyRegion,
  LeaderboardHeadlines,
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
  geography: AdminGeographyMetrics | null;
  leaderboards: LeaderboardHeadlines | null;
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

// ─── Geography (#624) ────────────────────────────────────────────────────────

/** Which population a geography panel is counting. */
export type GeographyMeasure = 'users' | 'pools';

export const GEOGRAPHY_MEASURE_LABEL: Record<GeographyMeasure, string> = {
  users: 'Users',
  pools: 'Pools',
};

/** The count for the selected measure, so panels stop re-deciding it. */
export function cityCount(city: AdminGeographyCity, measure: GeographyMeasure): number {
  return measure === 'users' ? city.userCount : city.poolCount;
}

export function countryCount(
  country: AdminGeographyCountry,
  measure: GeographyMeasure,
): number {
  return measure === 'users' ? country.userCount : country.poolCount;
}

export function regionCount(region: AdminGeographyRegion, measure: GeographyMeasure): number {
  return measure === 'users' ? region.userCount : region.poolCount;
}

/**
 * Cities as chart rows for one measure, largest first.
 *
 * ⚠️ ROWS WITH A ZERO COUNT ARE DROPPED. The response is sorted by
 * `userCount + poolCount`, so a city that holds pools but no users is in the
 * list — and plotting it on the USERS chart as a zero-length bar adds a label
 * for a city with nobody in it. The tie-break is the key, so the order is
 * stable between reloads rather than dependent on the sort's stability.
 */
export function cityRows(
  cities: AdminGeographyCity[] | undefined,
  measure: GeographyMeasure,
): LabelledRow[] {
  return (cities ?? [])
    .map((c) => ({ label: c.display, value: cityCount(c, measure), key: c.key }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
}

/** "United States" from an alpha-2, or an explicit "no country in the key". */
export function countryLabel(code: string | null): string {
  return code === null ? 'No country recorded' : countryDisplayName(code);
}

/** "MO · United States" — a region is meaningless without its country. */
export function regionLabel(region: AdminGeographyRegion): string {
  const country = countryDisplayName(region.countryCode);
  return region.regionName
    ? `${region.regionName}, ${country}`
    : `${region.regionCode} · ${country}`;
}

/**
 * How many cities carry a plottable point, and how many do not.
 *
 * The map is blocked on the tiles CDN (poolmobile#649), so this is what the map
 * panel reports instead of pretending to be empty: the data IS here, and this
 * says exactly how much of it would render the moment the tiles are readable.
 */
export function mappableCities(cities: AdminGeographyCity[] | undefined): {
  withPoint: number;
  withoutPoint: number;
} {
  const all = cities ?? [];
  const withPoint = all.filter((c) => c.lat !== null && c.lng !== null).length;
  return { withPoint, withoutPoint: all.length - withPoint };
}

// ─── Leaderboard headlines (#681) ────────────────────────────────────────────

/**
 * Board → the words for it, and the noun its ranking value counts.
 *
 * ⚠️ THE UNIT IS PART OF THE FACT. `value` is a bare number whose meaning
 * changes per board — expenses on one, days on another — so rendering it
 * without the noun would put "412" under "Longest running" and let a reader
 * take it for a count of something.
 */
export const LEADERBOARD_BOARD_COPY: Record<
  GlobalLeaderboardBoard,
  { label: string; unit: string }
> = {
  [GlobalLeaderboardBoard.TopPoolsByTransactions]: {
    label: 'Most expenses logged',
    unit: 'expenses',
  },
  [GlobalLeaderboardBoard.MostActive]: { label: 'Most active', unit: 'events' },
  [GlobalLeaderboardBoard.MostMembers]: { label: 'Most members', unit: 'members' },
  [GlobalLeaderboardBoard.LongestRunning]: { label: 'Longest running', unit: 'days' },
  [GlobalLeaderboardBoard.FastestGrowing]: {
    label: 'Fastest growing',
    unit: 'new members',
  },
};

/**
 * The Stats range (in days) → the nearest board PERIOD that contains it.
 *
 * ⚠️ THE TWO AXES ARE NOT THE SAME, and the panel says which period it used
 * rather than implying the range applied. The boards have a fixed four-period
 * vocabulary; 90 days has no exact member, so it maps to the year — the
 * smallest period that still contains the window. Mapping it DOWN would show a
 * board narrower than the range the reader selected.
 */
export function boardPeriodForDays(days: number): LeaderboardPeriod {
  if (days <= 7) return LeaderboardPeriod.Week;
  if (days <= 31) return LeaderboardPeriod.Month;
  return LeaderboardPeriod.Year;
}
