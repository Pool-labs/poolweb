'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/** A single plottable point. `value` is always a plain count (never money). */
export interface ChartPoint {
  label: string;
  value: number;
}

interface SeriesChartProps {
  data: ChartPoint[];
  height?: number;
  color?: string;
}

const DEFAULT_COLOR = 'hsl(var(--primary))';

/** A responsive line chart over a labelled series (used for time-series counts). */
export function SeriesLineChart({ data, height = 220, color = DEFAULT_COLOR }: SeriesChartProps) {
  if (data.length === 0) {
    return <EmptyChart height={height} />;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** A responsive bar chart over a labelled series (used for distributions). */
export function SeriesBarChart({ data, height = 220, color = DEFAULT_COLOR }: SeriesChartProps) {
  if (data.length === 0) {
    return <EmptyChart height={height} />;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={48} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
        <Tooltip />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center text-sm text-muted-foreground"
      style={{ height }}
    >
      No data in this window
    </div>
  );
}
