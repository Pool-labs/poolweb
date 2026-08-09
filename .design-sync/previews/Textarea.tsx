import { Textarea, Label } from "my-v0-project"

export function States() {
  return (
    <div className="max-w-sm space-y-4">
      <Textarea placeholder="What's this pool for?" />
      <Textarea defaultValue="Everyone chips in on Friday. Lift tickets are already covered." rows={3} />
      <Textarea placeholder="Disabled" disabled />
    </div>
  )
}

export function Labelled() {
  return (
    <div className="max-w-sm space-y-2">
      <Label htmlFor="note">Note to the crew</Label>
      <Textarea id="note" rows={4} placeholder="Add a note…" />
    </div>
  )
}
