import { Button } from "my-v0-project"

// The shadcn button, remapped onto the Pool palette (primary = navy).
// For marketing surfaces use StickerButton instead — this is the app/admin button.
export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Add money</Button>
      <Button variant="secondary">Invite</Button>
      <Button variant="outline">Details</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="link">Learn more</Button>
      <Button variant="destructive">Suspend pool</Button>
    </div>
  )
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button>Default</Button>
      <Button size="lg">Large</Button>
    </div>
  )
}

export function Disabled() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled>Add money</Button>
      <Button variant="outline" disabled>
        Details
      </Button>
    </div>
  )
}
