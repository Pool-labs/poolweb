import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CHART_PALETTE, chartColor, seriesColor, CHART_SERIES_SLOTS } from '@/lib/admin/charts';

/**
 * The drift guard for the chart palette (poolweb #33).
 *
 * `lib/admin/charts.ts` is the source of truth and carries the reasoning; the
 * values that actually paint the screen live in `app/globals.css` as custom
 * properties. Two copies of the same fact is exactly the shape of bug this repo
 * has been bitten by before (#618/#623: two repos, one contract, a hand-written
 * copy that drifted) — so the copies are checked against each other here rather
 * than trusted.
 *
 * A failure means: you changed one and not the other. Edit charts.ts, then
 * mirror it into globals.css.
 */

const CSS = readFileSync(fileURLToPath(new URL('../../../app/globals.css', import.meta.url)), 'utf8');

/** Pull the `--chart-*` declarations out of one CSS block. */
function chartVarsIn(selector: string): Record<string, string> {
  // The base layer holds `:root { … }` and `.dark { … }` as sibling blocks.
  const start = CSS.indexOf(`${selector} {`);
  expect(start, `${selector} block should exist in globals.css`).toBeGreaterThan(-1);
  const end = CSS.indexOf('\n  }', start);
  const block = CSS.slice(start, end);
  const found: Record<string, string> = {};
  for (const match of block.matchAll(/--chart-([a-z0-9-]+):\s*(#[0-9a-f]{6});/g)) {
    found[match[1]] = match[2];
  }
  return found;
}

describe('chart palette ↔ globals.css', () => {
  it.each([
    ['light', ':root'],
    ['dark', '.dark'],
  ] as const)('%s mode declares exactly the roles charts.ts defines', (mode, selector) => {
    const declared = chartVarsIn(selector);
    const expected = CHART_PALETTE[mode];

    expect(Object.keys(declared).sort()).toEqual(Object.keys(expected).sort());
    for (const [role, hex] of Object.entries(expected)) {
      expect(declared[role], `--chart-${role} in ${selector}`).toBe(hex);
    }
  });

  it('gives both modes the same roles — a role that exists in one must exist in both', () => {
    expect(Object.keys(CHART_PALETTE.light).sort()).toEqual(Object.keys(CHART_PALETTE.dark).sort());
  });
});

describe('colour lookup', () => {
  it('maps a role to its custom property', () => {
    expect(chartColor('good')).toBe('var(--chart-good)');
    expect(chartColor('series-3')).toBe('var(--chart-series-3)');
  });

  it('hands out the eight categorical slots in order', () => {
    expect(seriesColor(0)).toBe('var(--chart-series-1)');
    expect(seriesColor(CHART_SERIES_SLOTS - 1)).toBe('var(--chart-series-8)');
  });

  it('greys the tail instead of CYCLING the palette', () => {
    // ⚠️ The regression this exists for: a wrapped palette gives two different
    // series the same colour, which reads as "these are the same thing".
    expect(seriesColor(CHART_SERIES_SLOTS)).toBe('var(--chart-neutral)');
    expect(seriesColor(CHART_SERIES_SLOTS + 5)).toBe('var(--chart-neutral)');
    expect(seriesColor(-1)).toBe('var(--chart-neutral)');
  });
});
