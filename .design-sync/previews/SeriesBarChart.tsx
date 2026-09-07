import { SeriesBarChart } from "my-v0-project"

const POOLS_CREATED = [
  { label: "Week 1", value: 8 }, { label: "Week 2", value: 15 }, { label: "Week 3", value: 12 },
  { label: "Week 4", value: 26 }, { label: "Week 5", value: 34 },
]

export function Default() {
  return (
    <div className="w-full max-w-xl">
      <SeriesBarChart data={POOLS_CREATED} />
    </div>
  )
}

export function Branded() {
  return (
    <div className="w-full max-w-xl">
      <SeriesBarChart data={POOLS_CREATED} height={160} color="#FFCE3E" />
    </div>
  )
}

export function Empty() {
  return (
    <div className="w-full max-w-xl">
      <SeriesBarChart data={[]} />
    </div>
  )
}
