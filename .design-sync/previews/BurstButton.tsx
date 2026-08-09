import { BurstButton } from "my-v0-project"

// A link-shaped CTA that bursts droplets on click. `href` and children are
// both required — it is always a navigation target.
export function Default() {
  return <BurstButton href="/preregister">Pre-register for the beta</BurstButton>
}

export function InARow() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <BurstButton href="/preregister">Pre-register</BurstButton>
      <BurstButton href="/questionnaire">Take the questionnaire</BurstButton>
    </div>
  )
}
