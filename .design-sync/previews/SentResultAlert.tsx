import { SentResultAlert } from "my-v0-project"

const IDS = ["usr_9a3f", "usr_1c8e", "usr_44b2", "usr_7d10"]

// Green when everyone selected was reached; amber when fewer ids come back
// than were selected — absence from recipientIds is the ONLY failure signal.
export function AllReached() {
  return (
    <div className="max-w-lg">
      <SentResultAlert sentCount={4} recipientIds={IDS} selectedCount={4} />
    </div>
  )
}

export function ShortOfSelection() {
  return (
    <div className="max-w-lg">
      <SentResultAlert sentCount={2} recipientIds={IDS.slice(0, 2)} selectedCount={5} />
    </div>
  )
}

export function Broadcast() {
  return (
    <div className="max-w-lg">
      <SentResultAlert sentCount={128} recipientIds={IDS} title="Broadcast sent" />
    </div>
  )
}
