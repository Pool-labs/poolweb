import { Progress } from "my-v0-project"

export function Values() {
  return (
    <div className="max-w-sm space-y-5">
      <Progress value={12} />
      <Progress value={48} />
      <Progress value={86} />
      <Progress value={100} />
    </div>
  )
}

export function Labelled() {
  return (
    <div className="max-w-sm space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-bold">Ski Trip &rsquo;26</span>
        <span className="opacity-70">$1,240 of $2,000</span>
      </div>
      <Progress value={62} />
    </div>
  )
}
