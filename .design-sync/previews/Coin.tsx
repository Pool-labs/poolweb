import { Coin } from "my-v0-project"

export function Sizes() {
  return (
    <div className="flex items-end gap-5">
      <Coin className="w-6" />
      <Coin className="w-10" />
      <Coin className="w-16" />
    </div>
  )
}

export function Scattered() {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-sky-tint p-6">
      <Coin className="w-10 -rotate-12" />
      <Coin className="w-8 rotate-6" />
      <Coin className="w-12 -rotate-3" />
    </div>
  )
}
