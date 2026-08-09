import { Label, Input } from "my-v0-project"

// Label is always paired with a control via htmlFor.
export function WithInput() {
  return (
    <div className="max-w-sm space-y-2">
      <Label htmlFor="pool-name">Pool name</Label>
      <Input id="pool-name" defaultValue="Ski Trip '26" />
    </div>
  )
}

export function Standalone() {
  return (
    <div className="space-y-3">
      <Label>Email address</Label>
      <Label>Notification preference</Label>
    </div>
  )
}
