import { AlertsPanel } from "my-v0-project"

const ALARM = (over: Record<string, unknown> = {}) => ({
  key: "api_5xx", name: "pool-staging-api-5xx", label: "API 5xx rate",
  description: "Fires when the API returns 5xx more than 10 times in 5 minutes.",
  state: "ok", stateUpdatedAt: "2026-03-04T11:00:00Z", stateReason: null,
  lastNotifiedAt: null, ...over,
})

const STATE = {
  environment: "staging", status: "ok", alarmPrefix: "pool-staging", criticalCount: 0,
  alarms: [
    ALARM(),
    ALARM({ key: "db_conn", name: "pool-staging-db-connections", label: "DB connections", state: "insufficient_data" }),
    ALARM({ key: "queue_depth", name: "pool-staging-queue-depth", label: "Queue depth", state: "unknown" }),
  ],
  email: { status: "environment_not_eligible", enabled: false, recipientCount: 0 },
}

export function AllClear() {
  return <div className="max-w-2xl"><AlertsPanel state={STATE as never} loading={false} error={null} /></div>
}

export function Critical() {
  return (
    <div className="max-w-2xl">
      <AlertsPanel
        loading={false}
        error={null}
        state={{
          ...STATE,
          environment: "production",
          criticalCount: 1,
          alarms: [
            ALARM({ state: "alarm", stateUpdatedAt: "2026-03-04T11:57:00Z",
              stateReason: "1 datapoint [24.0] was greater than the threshold (10.0)",
              lastNotifiedAt: "2026-03-04T11:57:12Z" }),
            ...STATE.alarms.slice(1),
          ],
          email: { status: "sending", enabled: true, recipientCount: 3 },
        } as never}
      />
    </div>
  )
}

export function Loading() {
  return <div className="max-w-2xl"><AlertsPanel state={null} loading error={null} /></div>
}

export function Errored() {
  return (
    <div className="max-w-2xl">
      <AlertsPanel state={null} loading={false} error="CloudWatch read failed: AccessDenied" />
    </div>
  )
}
