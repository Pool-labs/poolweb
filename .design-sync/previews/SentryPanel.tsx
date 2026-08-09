import { SentryPanel } from "my-v0-project"

const SUMMARY = {
  query: "is:unresolved environment:staging",
  issues: [
    { id: "4821", shortId: "POOL-API-3F", title: "PrismaClientKnownRequestError: Write conflict",
      culprit: "PoolDepositService.create", level: "error", count: 42, userCount: 7,
      firstSeen: "2026-03-01T09:12:00Z", lastSeen: "2026-03-04T11:58:00Z",
      permalink: "https://sentry.io/organizations/pool/issues/4821/" },
    { id: "4790", shortId: "POOL-API-2A", title: "TypeError: Cannot read properties of undefined",
      culprit: "NotificationDispatcher.send", level: "error", count: 9, userCount: 3,
      firstSeen: "2026-02-28T14:02:00Z", lastSeen: "2026-03-04T10:41:00Z",
      permalink: "https://sentry.io/organizations/pool/issues/4790/" },
  ],
}

export function WithIssues() {
  return (
    <div className="max-w-2xl">
      <SentryPanel
        status={"ok" as never}
        issuesUrl="https://sentry.io/organizations/pool/issues/"
        summary={SUMMARY as never}
      />
    </div>
  )
}

export function NoIssues() {
  return (
    <div className="max-w-2xl">
      <SentryPanel
        status={"ok" as never}
        issuesUrl="https://sentry.io/organizations/pool/issues/"
        summary={{ query: SUMMARY.query, issues: [] } as never}
      />
    </div>
  )
}

// The org slug is configured but the API token is not — degrades to
// "open Sentry", never to a dead panel.
export function TokenUnwired() {
  return (
    <div className="max-w-2xl">
      <SentryPanel
        status={"unconfigured" as never}
        issuesUrl="https://sentry.io/organizations/pool/issues/"
        summary={null}
      />
    </div>
  )
}
