import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label } from "my-v0-project"

// The trigger is what renders in a card — the content popover only mounts once
// opened, so these previews show the closed control (its real resting state).
export function Default() {
  return (
    <div className="max-w-xs">
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
          <SelectItem value="suspended">Suspended</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

export function WithValue() {
  return (
    <div className="max-w-xs">
      <Select defaultValue="open">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

export function Labelled() {
  return (
    <div className="max-w-xs space-y-2">
      <Label htmlFor="env">Environment</Label>
      <Select defaultValue="staging">
        <SelectTrigger id="env">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="staging">Staging</SelectItem>
          <SelectItem value="production">Production</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
