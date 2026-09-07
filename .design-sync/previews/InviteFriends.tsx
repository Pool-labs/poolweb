import { InviteFriends } from "my-v0-project"

export function Default() {
  return (
    <div className="max-w-lg">
      <InviteFriends />
    </div>
  )
}

export function CustomCopy() {
  return (
    <div className="max-w-lg">
      <InviteFriends
        headline="Bring your crew"
        subtext="Pool is better with the people you already spend time with."
        sharePath="/join?ref=brunch-crew"
      />
    </div>
  )
}
