import { ConfirmPhraseInput } from "my-v0-project"

// The guard in front of every irreversible QA action. The typed value must
// equal `phrase` EXACTLY (no trim, no case-folding) — same comparison the
// server does. Each guarded action uses a different phrase on purpose.
export function Empty() {
  return (
    <div className="max-w-sm">
      <ConfirmPhraseInput id="c1" phrase="RESEED STAGING" value="" onChange={() => {}} />
    </div>
  )
}

export function NotYetMatching() {
  return (
    <div className="max-w-sm">
      <ConfirmPhraseInput id="c2" phrase="RESEED STAGING" value="reseed stag" onChange={() => {}} />
    </div>
  )
}

export function Matched() {
  return (
    <div className="max-w-sm">
      <ConfirmPhraseInput id="c3" phrase="RESEED STAGING" value="RESEED STAGING" onChange={() => {}} />
    </div>
  )
}
