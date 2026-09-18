'use client';

import { ChartCard, DistributionList, FunnelSteps } from '@/components/admin/charts';
import { funnelSteps, recordToEntries } from '@/lib/admin/stats';
import type { StatsTabProps } from './types';

/**
 * Funnels — the #81 client-event view of the same journeys the other tabs
 * measure server-side.
 *
 * ⚠️ THESE NUMBERS ARE THE LEAST AUTHORITATIVE ON THE PAGE, and that is their
 * job. Analytics is killswitched, fire-and-forget and strips unknown props at
 * ingest (#24/#81), so an event that never arrived is indistinguishable from a
 * user who never acted. Read against the server-derived activation figure on
 * the Growth tab, a divergence between the two IS the finding — usually a
 * telemetry outage, not a drop in behaviour.
 */
export function FunnelsTab({ data, days }: StatsTabProps) {
  const windowLabel = `Last ${days} days`;

  const panels: { title: string; steps: ReturnType<typeof funnelSteps>; loaded: boolean }[] = [
    {
      title: 'Auth funnel',
      steps: funnelSteps(data.authFunnel),
      loaded: data.authFunnel !== null,
    },
    {
      title: 'Pool — create path',
      steps: funnelSteps(data.poolFunnel?.create ?? null),
      loaded: data.poolFunnel !== null,
    },
    {
      title: 'Pool — join path',
      steps: funnelSteps(data.poolFunnel?.join ?? null),
      loaded: data.poolFunnel !== null,
    },
    {
      title: 'Discover funnel',
      steps: funnelSteps(data.discoverFunnel),
      loaded: data.discoverFunnel !== null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {panels.map((panel) => (
          <ChartCard
            key={panel.title}
            title={panel.title}
            description={`${windowLabel} — actors per stage, with the conversion from the first stage`}
          >
            <FunnelSteps
              steps={panel.loaded ? panel.steps : []}
              emptyReason={panel.loaded ? 'no-data' : 'unavailable'}
              emptyDetail={
                panel.loaded
                  ? 'The report answered and holds no events for this window.'
                  : 'This funnel did not load — it says nothing about whether the journey happened.'
              }
            />
          </ChartCard>
        ))}
      </div>

      <ChartCard
        title="Money events (counts only)"
        description={`${windowLabel} — the same report the Money tab shows, repeated here because a funnel reader wants it beside the journeys`}
      >
        <DistributionList
          entries={recordToEntries(data.moneyEvents?.totals)}
          emptyReason={data.moneyEvents ? 'no-data' : 'unavailable'}
        />
      </ChartCard>
    </div>
  );
}
