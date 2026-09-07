import { UserTimeline } from "my-v0-project"

const LOG = {
  timestamp: "2026-03-04T11:58:02Z", level: 50, levelLabel: "error",
  message: "Transaction failed after 3 retries", requestId: "req_9f31ab",
  method: "POST", path: "/api/v1/pools/pl_8f2a/deposits", status: 500, durationMs: 4820,
  userId: "usr_1c8e04", signal: "transaction_contention", errorCode: "P2034",
  errorType: "PrismaClientKnownRequestError", errorMessage: "Write conflict on pool_balance",
  logStream: "ecs/api/8f21ab90",
}

// `metadata` and `props` are rendered by KeyValues via Object.entries — they are
// always objects on the wire, never null.
const AUDIT = {
  id: "aud_51ba", action: "pool.suspended", actorId: "usr_admin1",
  targetType: "pool", targetId: "pl_8f2a", poolId: "pl_8f2a",
  metadata: { reason: "moderation", balanceCents: 124000 },
  requestId: "req_9f31ab", ip: "203.0.113.42", createdAt: "2026-03-04T11:30:00Z",
}

// occurredAt vs createdAt: the timeline orders by the SERVER's ingest time, and
// only surfaces the device's own claim when the two disagree.
const ANALYTICS = {
  id: "evt_7712", name: "pool_deposit_started", sessionId: "ses_31ab",
  platform: "ios", appVersion: "1.4.2",
  props: { poolId: "pl_8f2a", surface: "pool_detail" },
  occurredAt: "2026-03-04T10:02:11Z", createdAt: "2026-03-04T10:02:11Z",
}

// One user's activity woven from three stores — logs, audit and analytics —
// most-recent-first. No stable cross-source id exists, so entries are keyed by
// source + timestamp + index.
export function ThreeSources() {
  return (
    <div className="max-w-2xl">
      <UserTimeline
        entries={[
          { source: "logs", timestamp: LOG.timestamp, log: LOG },
          { source: "audit", timestamp: AUDIT.createdAt, audit: AUDIT },
          { source: "analytics", timestamp: ANALYTICS.createdAt, analytics: ANALYTICS },
        ] as never}
      />
    </div>
  )
}

export function ClockSkew() {
  return (
    <div className="max-w-2xl">
      <UserTimeline
        entries={[
          {
            source: "analytics",
            timestamp: ANALYTICS.createdAt,
            analytics: { ...ANALYTICS, occurredAt: "2026-03-04T09:47:55Z" },
          },
        ] as never}
      />
    </div>
  )
}

export function Empty() {
  return (
    <div className="max-w-2xl">
      <UserTimeline entries={[]} />
    </div>
  )
}
