import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Button, Badge } from "my-v0-project"

export function Composed() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Ski trip — Chamonix</CardTitle>
        <CardDescription>6 people · created 3 days ago</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-display font-extrabold">$2,480</span>
          <span className="text-sm opacity-70">in the pool</span>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button>Add money</Button>
        <Button variant="outline">Invite</Button>
      </CardFooter>
    </Card>
  )
}

export function WithStatus() {
  return (
    <Card className="max-w-sm">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Sunday roast club</CardTitle>
          <CardDescription>Weekly · 4 people</CardDescription>
        </div>
        <Badge variant="secondary">Active</Badge>
      </CardHeader>
      <CardContent className="text-sm opacity-80">
        Everyone chips in on Friday. No IOUs, no awkward math.
      </CardContent>
    </Card>
  )
}

export function Bare() {
  return (
    <Card className="max-w-sm p-6">
      <p className="text-sm opacity-80">
        A plain card with no header or footer — just padded content.
      </p>
    </Card>
  )
}
