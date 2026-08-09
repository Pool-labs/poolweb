import { StickerButton } from "my-v0-project"

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <StickerButton variant="yellow">Start a Pool</StickerButton>
      <StickerButton variant="blue">Join the beta</StickerButton>
      <StickerButton variant="pink">Pre-register</StickerButton>
      <StickerButton variant="ghost">How it works</StickerButton>
    </div>
  )
}

export function AsLink() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <StickerButton href="/questionnaire" variant="blue" className="text-lg px-8 py-4">
        Jump in
      </StickerButton>
      <StickerButton href="#how-it-works" variant="ghost" className="text-lg px-6 py-3.5">
        See how it works
      </StickerButton>
    </div>
  )
}

export function Disabled() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <StickerButton variant="yellow" disabled className="opacity-50">
        Start a Pool
      </StickerButton>
      <StickerButton variant="ghost" disabled className="opacity-50">
        How it works
      </StickerButton>
    </div>
  )
}
