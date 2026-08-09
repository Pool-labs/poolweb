import { ScallopDivider } from "my-v0-project"

// The flat scalloped water edge between two colour bands. `color` is the
// scallop fill; `bg` is the section behind it (set both, or you get slivers).
export function BetweenBands() {
  return (
    <div>
      <div className="bg-cloud p-6 text-center text-sm font-bold">cloud section</div>
      <ScallopDivider color="#EAF7FE" bg="#FDFCF9" />
      <div className="bg-sky-tint p-6 text-center text-sm font-bold">sky-tint section</div>
    </div>
  )
}

export function Flipped() {
  return (
    <div>
      <div className="bg-sky-tint p-6 text-center text-sm font-bold">sky-tint section</div>
      <ScallopDivider color="#FDFCF9" bg="#EAF7FE" flip />
      <div className="bg-cloud p-6 text-center text-sm font-bold">cloud section</div>
    </div>
  )
}

export function Branded() {
  return (
    <div>
      <div className="bg-pool-yellow p-6 text-center text-sm font-bold">yellow band</div>
      <ScallopDivider color="#4EC3F5" bg="#FFCE3E" />
      <div className="bg-pool-blue p-6 text-center text-sm font-bold">blue band</div>
    </div>
  )
}
