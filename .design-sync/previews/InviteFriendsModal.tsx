import { InviteFriendsModal } from "my-v0-project"

// `open` drives visibility — a closed modal renders nothing, so the useful
// preview is the open state.
export function Open() {
  return <InviteFriendsModal open onClose={() => {}} />
}

export function CustomCopy() {
  return (
    <InviteFriendsModal
      open
      onClose={() => {}}
      title="Invite the crew"
      headline="Ski Trip '26 needs 3 more"
      subtext="Send them the link — they're in as soon as they tap it."
      sharePath="/join?ref=ski-26"
    />
  )
}
