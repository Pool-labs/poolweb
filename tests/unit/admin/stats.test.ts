import { describe, expect, it } from 'vitest';

import {
  categoryColor,
  computeDelta,
  formatDelta,
  POOL_STATUS_COLOR,
} from '@/lib/admin/charts';
import {
  bucketsToRows,
  deltaFor,
  formatRate,
  funnelSteps,
  poolCategoryLabel,
  moneySeriesToRows,
  recordToRows,
  seriesToRows,
  stickiness,
  topNWithOther,
} from '@/lib/admin/stats';
import { formatMoney } from '@/lib/admin/format';
import type { AdminActiveUsersMetrics, FunnelReport } from '@/lib/admin/types';

describe('computeDelta / formatDelta', () => {
  it('reads a rise as up, with the percentage and the absolute change', () => {
    const delta = computeDelta(120, 100);
    expect(delta).toEqual({ direction: 'up', absolute: 20, ratio: 0.2 });
    expect(formatDelta(delta)).toBe('+20% (+20)');
  });

  it('reads a fall as down', () => {
    const delta = computeDelta(80, 100);
    expect(delta.direction).toBe('down');
    expect(formatDelta(delta)).toBe('−20% (−20)');
  });

  it('spells out no change rather than showing "0%"', () => {
    // A tile reading "0%" looks like a measurement; "No change" is the fact.
    expect(formatDelta(computeDelta(7, 7))).toBe('No change');
  });

  it('refuses a percentage against a zero base and shows the bare change', () => {
    // ⚠️ The dangerous case: (5-0)/0 is Infinity, and "+100%" would be a lie in
    // the flattering direction — the first five of anything is not a doubling.
    const delta = computeDelta(5, 0);
    expect(delta.ratio).toBeNull();
    expect(formatDelta(delta)).toBe('+5');
  });
});

describe('deltaFor', () => {
  it('computes a delta when both halves are present', () => {
    expect(deltaFor(10, 4)?.direction).toBe('up');
  });

  it('returns undefined when the API reported no previous window', () => {
    // ⚠️ THIS IS THE #624-OPTIONALITY CONTRACT. A missing twin means the API
    // predates #624 — NOT that the figure did not move — so the tile must
    // render no delta at all rather than compare against an assumed zero.
    expect(deltaFor(10, undefined)).toBeUndefined();
    expect(deltaFor(undefined, 4)).toBeUndefined();
  });

  it('treats a real zero as a number, not as absent', () => {
    expect(deltaFor(3, 0)).toEqual({ direction: 'up', absolute: 3, ratio: null });
    expect(deltaFor(0, 3)?.direction).toBe('down');
  });
});

describe('row shaping', () => {
  it('keeps a histogram in the payload order and never sorts it by size', () => {
    // Ordinal buckets: "0 · 1–99 · 100–499" is the reading order. Sorting them
    // by count would destroy the only thing the axis means.
    const rows = bucketsToRows([
      { bucket: '0', count: 2 },
      { bucket: '1-99', count: 50 },
      { bucket: '100-499', count: 9 },
    ]);
    expect(rows.map((r) => r.label)).toEqual(['0', '1-99', '100-499']);
    expect(rows.map((r) => r.value)).toEqual([2, 50, 9]);
  });

  it('sorts a categorical record largest first, with a stable tiebreak', () => {
    const rows = recordToRows({ ACTIVE: 3, CLOSED: 9, ARCHIVED: 3 });
    expect(rows.map((r) => r.label)).toEqual(['Closed', 'Active', 'Archived']);
  });

  it('capitalises a bucket key that is already a word', () => {
    expect(bucketsToRows([{ bucket: 'today', count: 1 }])[0].label).toBe('Today');
    expect(bucketsToRows([{ bucket: '1000+', count: 1 }])[0].label).toBe('1000+');
  });

  it('maps a date series onto labelled rows', () => {
    expect(seriesToRows([{ date: '2026-09-18', count: 4 }])).toEqual([
      { label: '2026-09-18', value: 4 },
    ]);
  });

  it('survives an absent payload', () => {
    expect(bucketsToRows(undefined)).toEqual([]);
    expect(recordToRows(undefined)).toEqual([]);
    expect(seriesToRows(undefined)).toEqual([]);
  });
});

describe('topNWithOther', () => {
  const rows = [
    { label: 'a', value: 10 },
    { label: 'b', value: 5 },
    { label: 'c', value: 3 },
    { label: 'd', value: 1 },
  ];

  it('leaves a short list alone', () => {
    expect(topNWithOther(rows, 4)).toHaveLength(4);
    expect(topNWithOther(rows, 9)).toHaveLength(4);
  });

  it('SUMS the tail into a labelled row rather than dropping it', () => {
    // ⚠️ The regression: a "top 16" chart that silently discards the 17th
    // category makes the visible bars look like the whole population.
    const capped = topNWithOther(rows, 2);
    expect(capped).toHaveLength(3);
    expect(capped[2]).toEqual({ label: 'Other (2 more)', value: 4 });
  });

  it('omits an all-zero tail — an "Other: 0" row is noise, not information', () => {
    const withZeros = [...rows.slice(0, 2), { label: 'c', value: 0 }];
    expect(topNWithOther(withZeros, 2)).toHaveLength(2);
  });
});

describe('funnelSteps', () => {
  const report: FunnelReport = {
    since: '2026-09-01T00:00:00.000Z',
    windowDays: 30,
    stageOrder: ['signup_started', 'otp_verified'],
    buckets: [],
    totals: [
      { name: 'signup_started', actors: 100, events: 120 },
      { name: 'otp_verified', actors: 60, events: 60 },
    ],
    conversionRates: { signup_started: 1, otp_verified: 0.6 },
  };

  it('keeps the report order and carries each stage conversion', () => {
    expect(funnelSteps(report)).toEqual([
      { name: 'Signup started', actors: 100, conversion: 1 },
      { name: 'Otp verified', actors: 60, conversion: 0.6 },
    ]);
  });

  it('is empty for a funnel that did not load', () => {
    expect(funnelSteps(null)).toEqual([]);
  });
});

describe('stickiness', () => {
  it('is DAU over MAU', () => {
    expect(stickiness({ dau: 5, mau: 20 } as AdminActiveUsersMetrics)).toBe(0.25);
  });

  it('is UNANSWERABLE, not zero, with no monthly base', () => {
    // 0/0 is not "0% of people came back" — nobody could have.
    expect(stickiness({ dau: 0, mau: 0 } as AdminActiveUsersMetrics)).toBeNull();
    expect(stickiness(null)).toBeNull();
  });
});

describe('labels', () => {
  it('distinguishes "no category set" from the Other category', () => {
    // `uncategorized` is the absence of a choice; `other` is a choice somebody
    // made. Folding them together loses the #236 migration story.
    expect(poolCategoryLabel('uncategorized')).toBe('No category set');
    expect(poolCategoryLabel('other')).toBe('Other');
    expect(poolCategoryLabel('food_drink')).toBe('Food drink');
  });

  it('renders a rate as a whole-number percentage', () => {
    expect(formatRate(0.5)).toBe('50%');
    expect(formatRate(0)).toBe('0%');
  });
});

describe('categoryColor', () => {
  const domain = ['ACTIVE', 'CLOSED', 'ARCHIVED'];

  it('uses the fixed colour for a known value', () => {
    expect(categoryColor('ACTIVE', POOL_STATUS_COLOR, domain)).toBe('var(--chart-good)');
  });

  it('assigns an unknown value by its position in the DOMAIN, not its arrival order', () => {
    // ⚠️ Colour follows the entity, never its rank: filtering a status out must
    // not repaint the survivors.
    const full = ['A', 'B', 'C'];
    expect(categoryColor('C', {}, full)).toBe('var(--chart-series-3)');
    expect(categoryColor('C', {}, full)).toBe(categoryColor('C', {}, full));
  });

  it('greys a value the caller did not declare at all', () => {
    expect(categoryColor('MYSTERY', {}, domain)).toBe('var(--chart-neutral)');
  });
});

describe('moneySeriesToRows (poolmobile#647)', () => {
  it('keeps the figures in INTEGER CENTS', () => {
    // ⚠️ The rule this test defends: money never becomes a float on its way to
    // a chart. Dividing by 100 here would put 42100.00 in the row and the very
    // next refactor would do arithmetic on it. The chart formats at the edge.
    const rows = moneySeriesToRows([
      { date: '2026-09-16', depositedCents: 2_100_000, spentCents: 1_337_500 },
    ]);

    expect(rows).toEqual([
      { label: '2026-09-16', value: 2_100_000, deposited: 2_100_000, spent: 1_337_500 },
    ]);
    expect(Number.isInteger(rows[0].deposited as number)).toBe(true);
    // And formatting it is what produces dollars — in one place, at the edge.
    expect(formatMoney(rows[0].deposited as number)).toBe('$21,000.00');
  });

  it('preserves a real ZERO on one side', () => {
    // A day present with `spentCents: 0` saw no spend. That is a measurement,
    // not a gap, and dropping the key would make the line skip the point.
    const [row] = moneySeriesToRows([
      { date: '2026-09-17', depositedCents: 2_110_000, spentCents: 0 },
    ]);
    expect(row.spent).toBe(0);
  });

  it('does NOT zero-fill the gap between non-consecutive days', () => {
    // The server omits a day with no movement at all, and so does this. A
    // zero-filled calendar would make a quiet platform and a broken query
    // render identically.
    const rows = moneySeriesToRows([
      { date: '2026-09-10', depositedCents: 100, spentCents: 0 },
      { date: '2026-09-17', depositedCents: 200, spentCents: 0 },
    ]);
    expect(rows.map((r) => r.label)).toEqual(['2026-09-10', '2026-09-17']);
  });

  it('reads a missing series as no rows, never as a zero row', () => {
    expect(moneySeriesToRows(undefined)).toEqual([]);
  });
});

describe('formatDelta on a money figure', () => {
  it('formats the ABSOLUTE half with the same units as the tile', () => {
    // ⚠️ The regression. Without the formatter the percentage still looks
    // right — it is unit-free — while the absolute renders raw cents beside a
    // dollar value, stating one change twice in two units.
    const delta = computeDelta(4_210_000, 5_262_500);
    expect(formatDelta(delta)).toBe('−20% (−1,052,500)');
    expect(formatDelta(delta, formatMoney)).toBe('−20% (−$10,525.00)');
  });

  it('formats a delta with no comparable base too', () => {
    // `previous === 0` leaves no ratio, so the bare change is ALL the reader
    // gets — the one case where an unformatted number is the whole message.
    const delta = computeDelta(12_345, 0);
    expect(formatDelta(delta, formatMoney)).toBe('+$123.45');
  });

  it('leaves "No change" alone', () => {
    expect(formatDelta(computeDelta(100, 100), formatMoney)).toBe('No change');
  });
});
