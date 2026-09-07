import { Badge } from "my-v0-project"

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge>Active</Badge>
      <Badge variant="secondary">Pending</Badge>
      <Badge variant="outline">Archived</Badge>
      <Badge variant="destructive">Suspended</Badge>
    </div>
  )
}

export function InContext() {
  return (
    <div className="flex items-center gap-3">
      <span className="font-display text-xl font-extrabold">Ski Trip &rsquo;26</span>
      <Badge variant="secondary">Open</Badge>
      <Badge variant="outline">Private</Badge>
    </div>
  )
}
