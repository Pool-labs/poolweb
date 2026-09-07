import { Splash } from "my-v0-project"

export function Colors() {
  return (
    <div className="flex items-end gap-6">
      <Splash color="blue" className="w-20" />
      <Splash color="yellow" className="w-20" />
      <Splash color="pink" className="w-20" />
    </div>
  )
}
