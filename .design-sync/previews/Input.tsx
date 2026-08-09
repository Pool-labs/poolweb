import { Input, Label } from "my-v0-project"

export function States() {
  return (
    <div className="max-w-sm space-y-4">
      <Input placeholder="Search pools…" />
      <Input defaultValue="Ski Trip '26" />
      <Input placeholder="Disabled" disabled />
    </div>
  )
}

export function Labelled() {
  return (
    <div className="max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <Input id="amount" type="number" defaultValue={40} />
      </div>
    </div>
  )
}
