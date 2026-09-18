/**
 * The ONE chart colour system for the admin surface (poolweb #33).
 *
 * ⚠️ NOTHING ELSE MAY NAME A COLOUR. Every chart, legend, badge dot and delta
 * arrow on Stats reads a role from here; no page hardcodes a hex. That is the
 * whole point of the module: "pools by status" must be the same green in the
 * donut, in the trend and on the Pools table badge, or the reader has to
 * re-learn the legend on every panel.
 *
 * ── How the values reach the screen ────────────────────────────────────────
 * The hex tables below are the SOURCE OF TRUTH, and `app/globals.css` declares
 * the same values as CSS custom properties in the `:root` / `.dark` scopes.
 * Charts render `var(--chart-…)` strings (via the helpers here), so a theme
 * flip repaints every chart with no React state, no `resolvedTheme` read and no
 * hydration flash. `tests/unit/admin/chart-palette.test.ts` parses globals.css
 * and fails if the two ever drift — the tables here stay the thing you edit.
 *
 * ── Why THESE eight hues ───────────────────────────────────────────────────
 * They are the validated categorical palette from Anthropic's data-viz method,
 * in its documented slot order (the order IS the colour-blindness mechanism —
 * adjacent slots are the pairs that end up touching in a stack or a legend).
 * Checked with `validate_palette.js` against THIS dashboard's real surfaces —
 * white cards in light, `hsl(224 57% 14%)` cards in dark:
 *
 *   light  lightness band PASS · chroma PASS · CVD ΔE 9.1 PASS ·
 *          normal-vision ΔE 19.6 PASS · contrast WARN on aqua/yellow/magenta
 *   dark   every check PASS, contrast ≥ 3:1 on all eight
 *
 * The light-mode contrast WARN is not dismissable: it obliges a second,
 * non-colour channel wherever those fills carry meaning. Every chart here
 * therefore ships a labelled legend and an exact number (tooltip + the value
 * rendered as text), so colour is never the only way to read a panel.
 *
 * ── Long vocabularies deliberately get ONE hue ─────────────────────────────
 * `PoolCategory` has 16 members and `PointReason` around 20. Eight hues cannot
 * be extended to sixteen and stay distinguishable — a 9th generated hue is the
 * classic way a palette silently stops being colour-blind-safe — so those bars
 * are single-hue with the category on a labelled axis, where the BAR LENGTH
 * does the work colour would have done badly. Fixed per-value colours exist for
 * the small closed vocabularies that recur across panels (pool status,
 * visibility, settlement status, transaction status), which is where "the same
 * category is the same colour everywhere" actually pays.
 */

// ─── The palette ─────────────────────────────────────────────────────────────

/** A chart colour role. Each has a `--chart-<role>` custom property. */
export type ChartRole =
  | 'series-1'
  | 'series-2'
  | 'series-3'
  | 'series-4'
  | 'series-5'
  | 'series-6'
  | 'series-7'
  | 'series-8'
  | 'good'
  | 'warning'
  | 'serious'
  | 'critical'
  | 'neutral';

/**
 * Role → hex, per mode. `app/globals.css` mirrors this exactly; the unit test
 * proves it still does.
 *
 * `neutral` is one value in both modes (3.60:1 on white, 4.77:1 on the dark
 * card) and is NOT a categorical slot — it is the "this state is inert" grey
 * for archived/closed things, and for a delta that did not move.
 */
export const CHART_PALETTE: Record<'light' | 'dark', Record<ChartRole, string>> = {
  light: {
    'series-1': '#2a78d6',
    'series-2': '#eb6834',
    'series-3': '#1baf7a',
    'series-4': '#eda100',
    'series-5': '#e87ba4',
    'series-6': '#008300',
    'series-7': '#4a3aa7',
    'series-8': '#e34948',
    good: '#0ca30c',
    warning: '#fab219',
    serious: '#ec835a',
    critical: '#d03b3b',
    neutral: '#7c8899',
  },
  dark: {
    'series-1': '#3987e5',
    'series-2': '#d95926',
    'series-3': '#199e70',
    'series-4': '#c98500',
    'series-5': '#d55181',
    'series-6': '#008300',
    'series-7': '#9085e9',
    'series-8': '#e66767',
    good: '#0ca30c',
    warning: '#fab219',
    serious: '#ec835a',
    critical: '#d03b3b',
    neutral: '#7c8899',
  },
};

/** How many categorical slots exist. A 9th series folds into `neutral`. */
export const CHART_SERIES_SLOTS = 8;

/** The CSS custom property for a role, e.g. `var(--chart-series-1)`. */
export function chartColor(role: ChartRole): string {
  return `var(--chart-${role})`;
}

/**
 * The nth categorical slot (0-based), in the palette's fixed order.
 *
 * Past the eighth slot this returns `neutral` rather than wrapping: a cycled
 * palette gives two different series the same colour, which is worse than
 * honestly greying the tail. Callers that can hit the cap sort by size first,
 * so the grey is always the smallest slice.
 */
export function seriesColor(index: number): string {
  if (index < 0 || index >= CHART_SERIES_SLOTS) return chartColor('neutral');
  return chartColor(`series-${index + 1}` as ChartRole);
}

// ─── Semantic: lifecycle status, visibility, settlement, transactions ────────

/**
 * Pool lifecycle → colour, matching what the tables show: ACTIVE is the healthy
 * green, a SUSPENDED pool is the same red as the `destructive` badge the Pools
 * list renders, and the two inert end-states are grey because they are not
 * problems — a wall of amber CLOSED pools would read as an incident.
 *
 * Keyed by the wire value so a chart can look up whatever the API sent.
 */
export const POOL_STATUS_COLOR: Record<string, string> = {
  ACTIVE: chartColor('good'),
  CLOSED: chartColor('neutral'),
  ARCHIVED: chartColor('neutral'),
};

/** The #83 suspend state — the `destructive` badge's own colour. */
export const SUSPENDED_COLOR = chartColor('critical');

/**
 * Public vs private. Slots 1 and 2 — the palette's leading adjacent pair, which
 * is exactly the pair validated to survive being stacked against each other
 * (this is the public-vs-private share over time).
 */
export const POOL_VISIBILITY_COLOR: Record<string, string> = {
  PUBLIC: seriesColor(0),
  PRIVATE: seriesColor(1),
};

/**
 * #38 settlement statuses. A settlement is an attestation: CONFIRMED is done,
 * PENDING is waiting on a human, REJECTED is a dispute — good / warning /
 * critical is the honest mapping, and it is the one the app itself uses.
 */
export const SETTLEMENT_STATUS_COLOR: Record<string, string> = {
  CONFIRMED: chartColor('good'),
  PENDING: chartColor('warning'),
  REJECTED: chartColor('critical'),
};

/**
 * Transaction row statuses — the PRISMA values (`PENDING | APPROVED | DECLINED
 * | COMPLETED`), which is what the metrics service seeds `byStatus` from.
 *
 * ⚠️ Not the lowercase `verified/pending/disputed` enum that also exists in the
 * shared package: that one never reaches this endpoint, and keying on it makes
 * every slice miss its colour without anything failing.
 *
 * `APPROVED` takes a categorical slot rather than a status colour on purpose —
 * it is "in flight", neither a problem nor a finished transaction, and painting
 * it the same green as COMPLETED would claim money had moved.
 */
export const TRANSACTION_STATUS_COLOR: Record<string, string> = {
  COMPLETED: chartColor('good'),
  APPROVED: seriesColor(0),
  PENDING: chartColor('warning'),
  DECLINED: chartColor('critical'),
};

/**
 * Resolve a value in one of the closed vocabularies above to its fixed colour,
 * falling back to a categorical slot for anything the API adds later.
 *
 * ⚠️ The fallback is keyed on the value's POSITION IN THE SORTED DOMAIN, not on
 * the order it happened to arrive in: a filter that drops one status must not
 * repaint the survivors. Callers pass the full domain they are rendering.
 */
export function categoryColor(
  value: string,
  fixed: Record<string, string>,
  domain: readonly string[] = [],
): string {
  const known = fixed[value];
  if (known) return known;
  const index = domain.indexOf(value);
  return index === -1 ? chartColor('neutral') : seriesColor(index);
}

// ─── Deltas vs the previous window ───────────────────────────────────────────

/** Which way a windowed figure moved against the window before it. */
export type DeltaDirection = 'up' | 'down' | 'flat';

export interface WindowDelta {
  direction: DeltaDirection;
  /** `current - previous`, signed. */
  absolute: number;
  /**
   * `(current - previous) / previous`, or null when the previous window was 0 —
   * a percentage against a zero base is infinity, not "+100%", and rendering it
   * as a number would be a lie in the flattering direction.
   */
  ratio: number | null;
}

/** ▲ / ▼ / — plus the sign, so direction survives a greyscale print. */
export const DELTA_GLYPH: Record<DeltaDirection, string> = {
  up: '▲',
  down: '▼',
  flat: '—',
};

/**
 * Colour per direction. ⚠️ This encodes DIRECTION, not goodness — the founder's
 * brief asks for green-up / red-down across the board, and on a growth
 * dashboard every tile is a "more is better" figure. Anywhere that stops being
 * true, the tile needs its own copy rather than a re-coloured arrow.
 */
export const DELTA_COLOR: Record<DeltaDirection, string> = {
  up: chartColor('good'),
  down: chartColor('critical'),
  flat: chartColor('neutral'),
};

/** Tailwind text classes per direction, for the arrow + number in a tile. */
export const DELTA_TEXT_CLASS: Record<DeltaDirection, string> = {
  up: 'text-emerald-600 dark:text-emerald-400',
  down: 'text-destructive',
  flat: 'text-muted-foreground',
};

/** Compare a windowed figure with its previous-window twin. */
export function computeDelta(current: number, previous: number): WindowDelta {
  const absolute = current - previous;
  const direction: DeltaDirection = absolute > 0 ? 'up' : absolute < 0 ? 'down' : 'flat';
  return {
    direction,
    absolute,
    ratio: previous === 0 ? null : absolute / previous,
  };
}

/**
 * The delta as one short string: a percentage when there is a base to compare
 * against, otherwise the bare change ("+12"). "No change" is spelled out rather
 * than shown as "0%", which reads as a measurement failure.
 *
 * ⚠️ `formatAbsolute` IS REQUIRED WHENEVER THE FIGURE IS MONEY, and leaving it
 * out is a bug a reader cannot detect. The percentage is unit-free and looks
 * right either way, but the absolute half carries the raw number — so a delta
 * on a cents figure rendered "−1,052,500" beside a tile reading "$42,100.00",
 * which is the same change stated twice, once in dollars and once in cents,
 * with nothing to say which. Caught by the e2e spec, not by reasoning.
 */
export function formatDelta(
  delta: WindowDelta,
  formatAbsolute: (magnitude: number) => string = (magnitude) =>
    magnitude.toLocaleString('en-US'),
): string {
  if (delta.direction === 'flat') return 'No change';
  const sign = delta.absolute > 0 ? '+' : '−';
  const magnitude = formatAbsolute(Math.abs(delta.absolute));
  if (delta.ratio === null) return `${sign}${magnitude}`;
  return `${sign}${Math.abs(delta.ratio * 100).toFixed(0)}% (${sign}${magnitude})`;
}

/** "vs the 30 days before" — the comparison window, named on the tile. */
export function previousWindowLabel(days: number): string {
  return `vs the ${days} days before`;
}

// ─── "Why is this panel empty" ───────────────────────────────────────────────

/**
 * The four reasons a panel can be blank, borrowed wholesale from #116's
 * `sourceStatus` rule: an empty chart that says nothing lets "we could not
 * read this" be mistaken for "there is nothing here", and on a stats page that
 * mistake is silent and permanent.
 */
export type ChartEmptyReason =
  /** The source answered, and the WINDOW genuinely holds nothing. */
  | 'no-data'
  /**
   * The source answered, and there is nothing AT ALL — for a panel that is not
   * windowed. ⚠️ Distinct from `no-data` because the two are different facts:
   * on the freshly reset production database, "no data in this window" under a
   * panel headed "All time" tells a founder the range is empty when what is
   * empty is the platform.
   */
  | 'none-yet'
  /** The call failed — this panel knows nothing about the underlying figure. */
  | 'unavailable'
  /** The API cannot serve this yet, by a decision we have written down. */
  | 'not-servable';

export const CHART_EMPTY_COPY: Record<ChartEmptyReason, string> = {
  'no-data': 'No data in this window.',
  'none-yet': 'Nothing recorded yet.',
  unavailable: 'Could not load this panel — it says nothing about the real figure.',
  'not-servable': 'The API does not serve this yet.',
};
