import { SourceStatusPill } from "my-v0-project"

// Only `ok` licenses reading an empty panel as "nothing is wrong" — every other
// status means the panel is empty because nobody looked.
export function EveryStatus() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {(["ok", "disabled", "unconfigured", "unavailable"] as const).map((s) => (
        <SourceStatusPill key={s} source={"logs" as never} status={s as never} />
      ))}
    </div>
  )
}

export function EverySource() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {(["logs", "sentry", "audit", "analytics"] as const).map((s) => (
        <SourceStatusPill key={s} source={s as never} status={"ok" as never} showTitle />
      ))}
    </div>
  )
}

export function WithTitle() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SourceStatusPill source={"sentry" as never} status={"unconfigured" as never} showTitle />
      <SourceStatusPill source={"audit" as never} status={"unavailable" as never} showTitle />
    </div>
  )
}
