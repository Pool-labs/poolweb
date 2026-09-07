import { Wordmark } from "my-v0-project"

// `outline` picks the stroke colour so the wordmark stays legible on either
// a light page or a saturated brand band.
export function OnLight() {
  return (
    <div className="rounded-2xl bg-cloud p-8">
      <Wordmark outline="navy" className="w-56" />
    </div>
  )
}

export function OnColor() {
  return (
    <div className="rounded-2xl bg-pool-blue p-8">
      <Wordmark outline="cloud" className="w-56" />
    </div>
  )
}
