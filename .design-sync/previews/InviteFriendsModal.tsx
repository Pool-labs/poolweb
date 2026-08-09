import { InviteFriendsModal } from "my-v0-project"

// `open` drives visibility — a closed modal renders nothing, so the useful
// preview is the open state.
//
// The overlay is `fixed inset-0`, and the preview card's wrapper carries
// `transform: translateZ(0)` — a transformed ancestor becomes the containing
// block for fixed descendants. With nothing else in the card that wrapper has
// zero height, so the overlay resolves to 0px tall and the card captures blank.
// The spacer gives the overlay a stage to fill; it is layout only and renders
// nothing itself.
function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full" style={{ minHeight: 820 }}>
      {children}
    </div>
  )
}

export function Open() {
  return (
    <Stage>
      <InviteFriendsModal open onClose={() => {}} />
    </Stage>
  )
}

export function CustomCopy() {
  return (
    <Stage>
      <InviteFriendsModal
        open
        onClose={() => {}}
        title="Invite the crew"
        headline="Ski Trip '26 needs 3 more"
        subtext="Send them the link — they're in as soon as they tap it."
        sharePath="/join?ref=ski-26"
      />
    </Stage>
  )
}
