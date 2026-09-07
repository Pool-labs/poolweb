import { ContentSnapshot } from "my-v0-project"

// A FROZEN COPY taken at report time — it survives the sender deleting their
// account, an admin redaction, and the conversation itself. Saying so is the
// panel's main job.
export function WithText() {
  return (
    <div className="max-w-xl">
      <ContentSnapshot
        capturedAt="2026-03-02T18:41:09Z"
        snapshot="you never pay me back, everyone in this pool knows it. stop showing up."
      />
    </div>
  )
}

export function LongText() {
  return (
    <div className="max-w-xl">
      <ContentSnapshot
        capturedAt="2026-02-27T09:12:44Z"
        snapshot={
          "reported for spam — the same message was posted 14 times in a row:\n\n" +
          "join my pool join my pool join my pool join my pool join my pool ".repeat(6)
        }
      />
    </div>
  )
}

export function NoSnapshot() {
  return (
    <div className="max-w-xl">
      <ContentSnapshot capturedAt="2026-03-01T07:05:00Z" snapshot={null} />
    </div>
  )
}
