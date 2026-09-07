import { Droplet } from "my-v0-project"

// `color` is the whole variant axis — the four brand fills.
export function Colors() {
  return (
    <div className="flex items-end gap-5">
      <Droplet color="blue" className="w-10" />
      <Droplet color="yellow" className="w-10" />
      <Droplet color="pink" className="w-10" />
      <Droplet color="green" className="w-10" />
    </div>
  )
}

export function Sizes() {
  return (
    <div className="flex items-end gap-4">
      <Droplet color="blue" className="w-5" />
      <Droplet color="blue" className="w-8" />
      <Droplet color="blue" className="w-14" />
    </div>
  )
}
