import { SourceStatusNotice } from "my-v0-project"

// The full explanation of why a source is not trustworthy — the pill's long form.
export function Unconfigured() {
  return (
    <div className="max-w-xl">
      <SourceStatusNotice source={"sentry" as never} status={"unconfigured" as never} />
    </div>
  )
}

export function Unavailable() {
  return (
    <div className="max-w-xl">
      <SourceStatusNotice source={"logs" as never} status={"unavailable" as never} />
    </div>
  )
}

export function Disabled() {
  return (
    <div className="max-w-xl">
      <SourceStatusNotice source={"analytics" as never} status={"disabled" as never} />
    </div>
  )
}
