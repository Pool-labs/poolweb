import { HealthSummary } from "my-v0-project"

const ALERTS = (over: Record<string, unknown> = {}) => ({
  environment: "staging", status: "ok", alarmPrefix: "pool-staging", criticalCount: 0,
  alarms: [], email: { status: "sending", enabled: true, recipientCount: 3 }, ...over,
})

const FEED = (over: Record<string, unknown> = {}) => ({
  window: { hours: 24, since: "2026-03-03T12:00:00Z", until: "2026-03-04T12:00:00Z" },
  source: "cloudwatch",
  logs: { status: "ok", entries: [], truncated: false, summary: { total: 0, bySignal: {}, byStatus: {} } },
  sentry: { status: "ok", issuesUrl: null, summary: { query: "is:unresolved", issues: [] } },
  ...over,
})

export function Healthy() {
  return <div className="max-w-2xl"><HealthSummary alerts={ALERTS() as never} feed={FEED() as never} loading={false} /></div>
}

export function Degraded() {
  return (
    <div className="max-w-2xl">
      <HealthSummary
        loading={false}
        alerts={ALERTS({ criticalCount: 2, environment: "production" }) as never}
        feed={FEED({
          logs: { status: "unavailable", entries: [], truncated: false, summary: { total: 0, bySignal: {}, byStatus: {} } },
        }) as never}
      />
    </div>
  )
}

// Deliberately NOT "can't tell" while the first read is still in flight — an
// unresolved fetch is not a failed one.
export function FirstLoad() {
  return <div className="max-w-2xl"><HealthSummary alerts={null} feed={null} loading /></div>
}
