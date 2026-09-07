import { SeriesLineChart } from "my-v0-project"

// `value` is always a plain count, never money (see the component's own note).
const SIGNUPS = [
  { label: "Mon", value: 14 }, { label: "Tue", value: 22 }, { label: "Wed", value: 19 },
  { label: "Thu", value: 31 }, { label: "Fri", value: 44 }, { label: "Sat", value: 38 },
  { label: "Sun", value: 27 },
]

export function Default() {
  return (
    <div className="w-full max-w-xl">
      <SeriesLineChart data={SIGNUPS} />
    </div>
  )
}

export function Short() {
  return (
    <div className="w-full max-w-xl">
      <SeriesLineChart data={SIGNUPS} height={140} color="#4EC3F5" />
    </div>
  )
}

export function Empty() {
  return (
    <div className="w-full max-w-xl">
      <SeriesLineChart data={[]} />
    </div>
  )
}
