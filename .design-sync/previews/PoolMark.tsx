import { PoolMark } from "my-v0-project"

// The three-ring kiddie pool — the primary brand mark. It is a bare <svg> with
// a viewBox and no intrinsic size, so every use sets its own dimensions.
export function Sizes() {
  return (
    <div className="flex items-end gap-6">
      <PoolMark className="w-16" />
      <PoolMark className="w-24" />
      <PoolMark className="w-40" />
    </div>
  )
}

export function OnSky() {
  return (
    <div className="flex items-center justify-center rounded-2xl bg-sky-tint p-8">
      <PoolMark className="w-48" />
    </div>
  )
}
