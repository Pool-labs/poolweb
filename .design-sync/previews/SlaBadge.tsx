import { SlaBadge } from "my-v0-project"

// The badge never goes quiet: a report resolved LATE still renders as late.
// `now` is passed in so every badge on a page ticks from one clock.
const NOW = Date.parse("2026-03-04T12:00:00Z")
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000).toISOString()

export function Open() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SlaBadge now={NOW} report={{ createdAt: hoursAgo(2), status: "OPEN", reviewedAt: null } as never} />
      <SlaBadge now={NOW} report={{ createdAt: hoursAgo(20), status: "OPEN", reviewedAt: null } as never} />
      <SlaBadge now={NOW} report={{ createdAt: hoursAgo(96), status: "OPEN", reviewedAt: null } as never} />
    </div>
  )
}

export function Resolved() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SlaBadge
        now={NOW}
        report={{ createdAt: hoursAgo(6), status: "ACTIONED", reviewedAt: hoursAgo(4) } as never}
      />
      <SlaBadge
        now={NOW}
        report={{ createdAt: hoursAgo(120), status: "DISMISSED", reviewedAt: hoursAgo(10) } as never}
      />
    </div>
  )
}

export function Reviewing() {
  return (
    <SlaBadge now={NOW} report={{ createdAt: hoursAgo(9), status: "REVIEWING", reviewedAt: null } as never} />
  )
}
