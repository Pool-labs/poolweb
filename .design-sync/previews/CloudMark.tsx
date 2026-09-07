import { CloudMark } from "my-v0-project"

export function Sizes() {
  return (
    <div className="flex items-end gap-6">
      <CloudMark className="w-16" />
      <CloudMark className="w-28" />
      <CloudMark className="w-40" />
    </div>
  )
}

export function OnSky() {
  return (
    <div className="flex items-center gap-6 rounded-2xl bg-pool-blue p-8">
      <CloudMark className="w-28" />
      <CloudMark className="w-20 opacity-90" />
    </div>
  )
}
