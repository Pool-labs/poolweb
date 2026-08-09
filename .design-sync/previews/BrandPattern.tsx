import { BrandPattern } from "my-v0-project"

// BrandPattern is an absolutely-positioned fill — it needs a sized, relative
// container, and is meant to sit behind content at low opacity.
export function Variants() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {(["money", "droplets", "clouds"] as const).map((v) => (
        <div key={v} className="relative h-40 overflow-hidden rounded-2xl bg-sky-tint">
          <BrandPattern variant={v} />
          <span className="absolute bottom-2 left-3 text-xs font-bold opacity-70">{v}</span>
        </div>
      ))}
    </div>
  )
}

export function BehindContent() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-sky-tint p-10">
      <BrandPattern variant="money" opacity={0.35} />
      <div className="relative">
        <h3 className="font-display text-3xl font-extrabold">Ready to Jump In?</h3>
        <p className="mt-2 max-w-sm text-sm opacity-80">
          Your friends, your routines, your moments — all in one place.
        </p>
      </div>
    </div>
  )
}
