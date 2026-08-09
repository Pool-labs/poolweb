import { LogFeedTable } from "my-v0-project"

// Entries are strictly most-recent-first. Every free-text field renders as TEXT
// only — never as an href.
const ENTRIES = [
  {
    timestamp: "2026-03-04T11:58:02Z", level: 50, levelLabel: "error",
    message: "Transaction failed after 3 retries", requestId: "req_9f31ab",
    method: "POST", path: "/api/v1/pools/pl_8f2a/deposits", status: 500, durationMs: 4820,
    userId: "usr_1c8e04", signal: "transaction_contention", errorCode: "P2034",
    errorType: "PrismaClientKnownRequestError", errorMessage: "Write conflict on pool_balance",
    logStream: "ecs/api/8f21ab90",
  },
  {
    timestamp: "2026-03-04T11:54:47Z", level: 50, levelLabel: "error",
    message: "Connection pool timed out", requestId: "req_44b201",
    method: "GET", path: "/api/v1/users/me/pools", status: 503, durationMs: 10021,
    userId: null, signal: "connection_pool_timeout", errorCode: "P2024",
    errorType: "PrismaClientKnownRequestError", errorMessage: "Timed out fetching a connection",
    logStream: "ecs/api/8f21ab90",
  },
  {
    timestamp: "2026-03-04T11:41:15Z", level: 40, levelLabel: "warn",
    message: "Push delivery rejected by APNs", requestId: "req_7d1044",
    method: "POST", path: "/api/v1/notifications/dispatch", status: 207, durationMs: 612,
    userId: "usr_9a3f21", signal: "notification_failure", errorCode: null,
    errorType: null, errorMessage: "BadDeviceToken", logStream: "ecs/worker/2c19de44",
  },
]

export function Default() {
  return <LogFeedTable entries={ENTRIES as never} />
}

export function Empty() {
  return <LogFeedTable entries={[]} />
}
