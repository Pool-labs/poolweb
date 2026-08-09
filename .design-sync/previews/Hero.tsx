import { Hero } from "my-v0-project"

// Takes no props — the honest preview is the component itself, on the
// background it is designed to sit on.
export function Section() {
  return (
    <div className="bg-cloud">
      <Hero />
    </div>
  )
}
