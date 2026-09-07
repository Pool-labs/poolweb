import { Bill } from "my-v0-project"

export function Sizes() {
  return (
    <div className="flex items-end gap-5">
      <Bill className="w-12" />
      <Bill className="w-20" />
      <Bill className="w-28" />
    </div>
  )
}

export function Splashing() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-sky-tint p-6">
      <Bill className="w-20 -rotate-12" />
      <Bill className="w-16 rotate-6" />
    </div>
  )
}
