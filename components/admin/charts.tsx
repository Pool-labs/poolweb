'use client';

import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  CHART_EMPTY_COPY,
  DELTA_GLYPH,
  DELTA_TEXT_CLASS,
  chartColor,
  formatDelta,
  seriesColor,
  type ChartEmptyReason,
  type WindowDelta,
} from '@/lib/admin/charts';

/**
 * The chart kit for the Stats page (poolweb #33).
 *
 * Every primitive here obeys the same four rules, so no page has to remember
 * them:
 *
 *  1. **Colour comes from `lib/admin/charts.ts`, never from a prop with a hex
 *     in it.** A caller names a role or passes a per-value colour map that the
 *     palette module produced.
 *  2. **Two or more series always get a legend**, and every chart gets a
 *     tooltip carrying the exact number. Colour is never the only channel —
 *     which is not a nicety here: three of the eight light-mode slots sit below
 *     3:1 on white, and the palette's own rule is that those fills ship a
 *     visible label or a table.
 *  3. **An empty panel says WHY it is empty** (#116's `sourceStatus` rule). A
 *     chart that renders nothing when the call failed lets "we could not read
 *     this" be mistaken for "there is nothing here".
 *  4. **Axes are labelled** and the grid is recessive.
 */

// ─── Chrome ──────────────────────────────────────────────────────────────────

/** A titled panel. `aside` is for a scope pill or a link in the header row. */
export function ChartCard({
  title,
  description,
  aside,
  className,
  children,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 p-4 pb-1">
        <div className="min-w-0">
          <CardTitle className="text-sm">{title}</CardTitle>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {aside}
      </CardHeader>
      <CardContent className="p-4 pt-2">{children}</CardContent>
    </Card>
  );
}

/**
 * The honest empty state. ⚠️ `reason` is required on purpose — there is no
 * default, because the default would be the reassuring one and the dangerous
 * mistake is exactly that: a failed read rendering as "no data".
 */
export function ChartEmpty({
  reason,
  detail,
  height = 220,
}: {
  reason: ChartEmptyReason;
  /** Extra sentence — say what is blocked and on what, never just "empty". */
  detail?: string;
  height?: number;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 px-4 text-center"
      style={{ minHeight: height }}
    >
      <p
        className={cn(
          'text-sm',
          reason === 'no-data' ? 'text-muted-foreground' : 'font-medium text-amber-700 dark:text-amber-400',
        )}
      >
        {CHART_EMPTY_COPY[reason]}
      </p>
      {detail && <p className="max-w-prose text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

// ─── Shared recharts pieces ──────────────────────────────────────────────────

/**
 * Theme-aware tooltip. recharts' default is a white box with black text, which
 * is unreadable on the dark card — and the tooltip is where the EXACT number
 * lives, so it is not decoration.
 */
const TOOLTIP_PROPS = {
  cursor: { fill: 'hsl(var(--muted))', fillOpacity: 0.4 },
  contentStyle: {
    background: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    color: 'hsl(var(--popover-foreground))',
    fontSize: 12,
  },
  labelStyle: { color: 'hsl(var(--popover-foreground))', fontWeight: 600 },
  itemStyle: { color: 'hsl(var(--popover-foreground))' },
} as const;

const AXIS_TICK = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } as const;
const AXIS_LABEL_STYLE = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } as const;
const LEGEND_STYLE = { fontSize: 12, paddingTop: 4 } as const;

/** One named series on a multi-series chart. */
export interface ChartSeries {
  /** The row key this series reads. */
  key: string;
  /** The legend/tooltip name. */
  name: string;
  /** A palette colour — `seriesColor(n)` or a semantic role. */
  color: string;
}

export type ChartRow = Record<string, string | number>;

// ─── Trends ──────────────────────────────────────────────────────────────────

/**
 * A per-day line chart, one or more series.
 *
 * ⚠️ ONE Y-AXIS, ALWAYS. Two measures of different scale get two charts, never
 * a second axis — a dual-axis chart lets the author choose where the lines
 * cross, which is the most common way a truthful dataset is made to lie.
 */
export function TrendChart({
  rows,
  series,
  xKey = 'label',
  xLabel,
  yLabel,
  yWidth = 40,
  valueFormatter,
  height = 220,
  emptyReason = 'no-data',
  emptyDetail,
}: {
  rows: ChartRow[];
  series: ChartSeries[];
  xKey?: string;
  xLabel?: string;
  yLabel?: string;
  /** Widen the y-gutter when the formatted ticks are long (money, say). */
  yWidth?: number;
  /**
   * Formats the axis ticks AND the tooltip figure.
   *
   * ⚠️ REQUIRED WHENEVER THE ROWS CARRY CENTS. The row value stays integer
   * cents — `$120.00` plotted as `12000` is the same line, and keeping cents
   * in the data means no float ever touches money — but an unformatted axis
   * would read `12000` to somebody looking at a dollar chart, which is wrong
   * by a factor of 100 and looks entirely plausible. Pass `formatMoney`.
   */
  valueFormatter?: (value: number) => string;
  height?: number;
  emptyReason?: ChartEmptyReason;
  emptyDetail?: string;
}) {
  if (rows.length === 0) {
    return <ChartEmpty reason={emptyReason} detail={emptyDetail} height={height} />;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: xLabel ? 20 : 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.35} />
        <XAxis dataKey={xKey} tick={AXIS_TICK} interval="preserveStartEnd" minTickGap={24}>
          {xLabel && <Label value={xLabel} position="insideBottom" offset={-12} style={AXIS_LABEL_STYLE} />}
        </XAxis>
        <YAxis
          allowDecimals={false}
          tick={AXIS_TICK}
          width={yWidth}
          tickFormatter={valueFormatter}
        >
          {yLabel && <Label value={yLabel} angle={-90} position="insideLeft" style={AXIS_LABEL_STYLE} />}
        </YAxis>
        <Tooltip
          {...TOOLTIP_PROPS}
          formatter={valueFormatter ? (value: number) => valueFormatter(value) : undefined}
        />
        {series.length > 1 && <Legend wrapperStyle={LEGEND_STYLE} />}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** A cumulative area chart — one series, filled, for "accounts to date". */
export function CumulativeAreaChart({
  rows,
  series,
  xKey = 'label',
  yLabel,
  height = 220,
  emptyReason = 'no-data',
  emptyDetail,
}: {
  rows: ChartRow[];
  series: ChartSeries;
  xKey?: string;
  yLabel?: string;
  height?: number;
  emptyReason?: ChartEmptyReason;
  emptyDetail?: string;
}) {
  if (rows.length === 0) {
    return <ChartEmpty reason={emptyReason} detail={emptyDetail} height={height} />;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="cumulative-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={series.color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={series.color} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.35} />
        <XAxis dataKey={xKey} tick={AXIS_TICK} interval="preserveStartEnd" minTickGap={24} />
        <YAxis allowDecimals={false} tick={AXIS_TICK} width={40}>
          {yLabel && <Label value={yLabel} angle={-90} position="insideLeft" style={AXIS_LABEL_STYLE} />}
        </YAxis>
        <Tooltip {...TOOLTIP_PROPS} />
        <Area
          type="monotone"
          dataKey={series.key}
          name={series.name}
          stroke={series.color}
          strokeWidth={2}
          fill="url(#cumulative-fill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Distributions ───────────────────────────────────────────────────────────

/**
 * A vertical bar chart. `colors` gives per-bar colours for the closed
 * vocabularies (status, visibility); without it every bar takes slot 1, which
 * is the right answer for a nominal distribution — the bar length already
 * encodes the magnitude, so spending the identity channel on it would be
 * re-encoding, and a 16-hue palette cannot stay colour-blind-safe anyway.
 */
export function DistributionBarChart({
  rows,
  colors,
  stacked,
  series,
  xLabel,
  yLabel,
  height = 220,
  emptyReason = 'no-data',
  emptyDetail,
}: {
  rows: ChartRow[];
  /** Per-bar colour by the row's `label`, for single-series charts. */
  colors?: Record<string, string>;
  /** Several bars per category, stacked. */
  stacked?: boolean;
  series?: ChartSeries[];
  xLabel?: string;
  yLabel?: string;
  height?: number;
  emptyReason?: ChartEmptyReason;
  emptyDetail?: string;
}) {
  if (rows.length === 0) {
    return <ChartEmpty reason={emptyReason} detail={emptyDetail} height={height} />;
  }
  const multi = series && series.length > 0;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.35} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={56}
        >
          {xLabel && <Label value={xLabel} position="insideBottom" offset={-4} style={AXIS_LABEL_STYLE} />}
        </XAxis>
        <YAxis allowDecimals={false} tick={AXIS_TICK} width={40}>
          {yLabel && <Label value={yLabel} angle={-90} position="insideLeft" style={AXIS_LABEL_STYLE} />}
        </YAxis>
        <Tooltip {...TOOLTIP_PROPS} />
        {multi && series.length > 1 && <Legend wrapperStyle={LEGEND_STYLE} />}
        {multi ? (
          series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={s.color}
              stackId={stacked ? 'stack' : undefined}
              radius={stacked ? 0 : [4, 4, 0, 0]}
              isAnimationActive={false}
            />
          ))
        ) : (
          <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {rows.map((row) => (
              <Cell
                key={String(row.label)}
                fill={colors?.[String(row.label)] ?? seriesColor(0)}
              />
            ))}
          </Bar>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * A horizontal bar chart — the right form for a long vocabulary (categories,
 * cities, earning reasons), because the labels read horizontally instead of
 * being rotated into illegibility.
 */
export function HorizontalBarChart({
  rows,
  color,
  xLabel,
  valueName = 'Count',
  labelWidth = 140,
  height,
  emptyReason = 'no-data',
  emptyDetail,
}: {
  rows: ChartRow[];
  color?: string;
  xLabel?: string;
  /** What the value IS, in the tooltip — "Count" is wrong for a points total. */
  valueName?: string;
  labelWidth?: number;
  height?: number;
  emptyReason?: ChartEmptyReason;
  emptyDetail?: string;
}) {
  if (rows.length === 0) {
    return <ChartEmpty reason={emptyReason} detail={emptyDetail} height={height ?? 220} />;
  }
  // 26px a row keeps bars thin and the labels un-crowded at any list length.
  const computed = height ?? Math.max(160, rows.length * 26 + 48);
  return (
    <ResponsiveContainer width="100%" height={computed}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 4, right: 20, left: 4, bottom: xLabel ? 20 : 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.35} horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={AXIS_TICK}>
          {xLabel && <Label value={xLabel} position="insideBottom" offset={-12} style={AXIS_LABEL_STYLE} />}
        </XAxis>
        <YAxis
          type="category"
          dataKey="label"
          tick={AXIS_TICK}
          width={labelWidth}
          interval={0}
        />
        <Tooltip {...TOOLTIP_PROPS} />
        <Bar
          dataKey="value"
          name={valueName}
          fill={color ?? seriesColor(0)}
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * A donut for a split of a whole (status, visibility, settlement outcome).
 *
 * The legend carries the label, the count AND the share, so the reader never
 * has to judge an angle or match a colour — the two things a donut is worst at.
 */
export function SplitDonutChart({
  rows,
  colors,
  height = 220,
  emptyReason = 'no-data',
  emptyDetail,
}: {
  rows: { label: string; value: number }[];
  colors?: Record<string, string>;
  height?: number;
  emptyReason?: ChartEmptyReason;
  emptyDetail?: string;
}) {
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  if (rows.length === 0 || total === 0) {
    return <ChartEmpty reason={emptyReason} detail={emptyDetail} height={height} />;
  }
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <ResponsiveContainer width="100%" height={height} className="max-w-[220px]">
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="label"
            innerRadius="55%"
            outerRadius="85%"
            paddingAngle={2}
            stroke="hsl(var(--card))"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {rows.map((row, i) => (
              <Cell key={row.label} fill={colors?.[row.label] ?? seriesColor(i)} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP_PROPS} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {rows.map((row, i) => (
          <li key={row.label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: colors?.[row.label] ?? seriesColor(i) }}
            />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{row.label}</span>
            <span className="font-medium tabular-nums">{row.value.toLocaleString('en-US')}</span>
            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
              {((row.value / total) * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A funnel as step bars with the conversion between steps.
 *
 * Funnel stages are ORDINAL — swapping two changes the meaning — so they take
 * one hue at descending opacity rather than eight identities, and the order is
 * the payload's own `stageOrder`, never re-sorted by size.
 */
export function FunnelSteps({
  steps,
  emptyReason = 'no-data',
  emptyDetail,
}: {
  steps: { name: string; actors: number; conversion: number }[];
  emptyReason?: ChartEmptyReason;
  emptyDetail?: string;
}) {
  if (steps.length === 0) {
    return <ChartEmpty reason={emptyReason} detail={emptyDetail} height={120} />;
  }
  const top = Math.max(...steps.map((s) => s.actors), 1);
  return (
    <ol className="space-y-2">
      {steps.map((step, i) => (
        <li key={step.name} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 truncate text-muted-foreground">{step.name}</span>
            <span className="shrink-0 font-medium tabular-nums">
              {step.actors.toLocaleString('en-US')}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {(step.conversion * 100).toFixed(0)}%
              </span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((step.actors / top) * 100, step.actors > 0 ? 2 : 0)}%`,
                background: seriesColor(0),
                // Ordinal: the same hue, receding down the funnel.
                opacity: 1 - Math.min(i, 4) * 0.15,
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * A labelled list of counts — the non-chart form, for a distribution short
 * enough that the numbers ARE the visualization. Also the "table view" that
 * discharges the light-mode contrast relief rule beside a coloured panel.
 */
export function DistributionList({
  entries,
  colors,
  emptyReason = 'no-data',
  emptyDetail,
  footer,
}: {
  /** `[label, count]`, rendered in the order given. */
  entries: [string, number][];
  colors?: Record<string, string>;
  emptyReason?: ChartEmptyReason;
  emptyDetail?: string;
  footer?: string;
}) {
  if (entries.length === 0) {
    return <ChartEmpty reason={emptyReason} detail={emptyDetail} height={120} />;
  }
  return (
    <>
      <div className="space-y-1.5">
        {entries.map(([label, value]) => (
          <div key={label} className="flex items-center gap-2 text-sm">
            {colors?.[label] && (
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: colors[label] }}
              />
            )}
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{label}</span>
            <span className="font-medium tabular-nums">{value.toLocaleString('en-US')}</span>
          </div>
        ))}
      </div>
      {footer && <p className="mt-3 text-xs text-muted-foreground">{footer}</p>}
    </>
  );
}

// ─── Stat tiles ──────────────────────────────────────────────────────────────

/**
 * A headline figure, optionally with its change against the previous window.
 *
 * ⚠️ `—` AND `0` MEAN DIFFERENT THINGS AND MUST LOOK DIFFERENT. `value`
 * `undefined` renders `—`: the call failed or this API version does not report
 * the figure. A real `0` renders `0`. The Errors tab established the rule —
 * a zero from a source nobody read is a lie in the dangerous direction.
 *
 * The delta is rendered only when the API returned a previous-window twin, so a
 * pre-#624 API shows the figure with no comparison rather than a fake one.
 */
export function StatTile({
  label,
  value,
  sub,
  delta,
  deltaLabel,
  deltaFormat,
}: {
  label: string;
  value: number | string | undefined;
  sub?: string;
  delta?: WindowDelta;
  /** Names the comparison window — a delta with no stated baseline is noise. */
  deltaLabel?: string;
  /**
   * Formats the delta's ABSOLUTE half. Required when `value` is money: pass
   * the same formatter the value used, or the tile states one change in two
   * units — "$42,100.00" above "−1,052,500" — and says which is which nowhere.
   */
  deltaFormat?: (magnitude: number) => string;
}) {
  const display =
    value === undefined ? '—' : typeof value === 'number' ? value.toLocaleString('en-US') : value;
  return (
    <Card>
      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-bold tabular-nums">{display}</div>
        {delta && (
          <div
            className={cn(
              'mt-1 flex items-baseline gap-1 text-xs font-medium',
              DELTA_TEXT_CLASS[delta.direction],
            )}
          >
            <span aria-hidden="true">{DELTA_GLYPH[delta.direction]}</span>
            <span>{formatDelta(delta, deltaFormat)}</span>
            {deltaLabel && (
              <span className="font-normal text-muted-foreground">{deltaLabel}</span>
            )}
          </div>
        )}
        {sub !== undefined && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

/** A coloured dot for a status, so a table badge and a chart agree at a glance. */
export function StatusDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', className)}
      style={{ background: color }}
    />
  );
}

/** The palette's "inert" grey, exported so a caller need not import both files. */
export const NEUTRAL_COLOR = chartColor('neutral');
