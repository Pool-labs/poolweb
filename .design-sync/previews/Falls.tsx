import { Falls } from "my-v0-project"

// The falls are absolutely-positioned decorative curtains that fill their
// nearest positioned ancestor — they need a sized, relative container to be
// visible at all.
export function Curtains() {
  return (
    <div className="hp relative h-[420px] w-full overflow-hidden bg-sky-tint">
      <Falls />
    </div>
  )
}
