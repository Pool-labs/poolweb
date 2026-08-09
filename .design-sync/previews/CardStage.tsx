import { CardStage } from "my-v0-project"

// Wrapped in `.hp`: 113 of the 178 rules in app/home.css are scoped under an
// `.hp` ancestor (app/page.tsx wraps the page in it). Without it these sections
// render with unsized SVGs — the step coins fill the whole card.
// Takes no props — the honest preview is the component itself, on the
// background it is designed to sit on.
export function Section() {
  return (
    <div className="hp bg-cloud">
      <CardStage />
    </div>
  )
}
