import { PoolPicker } from "my-v0-project"

// Search-and-select for one pool. `selected` is the picked pool or null; the
// balance is integer cents.
export function Empty() {
  return (
    <div className="max-w-md">
      <PoolPicker selected={null} onChange={() => {}} hint="Search by pool name or id." />
    </div>
  )
}

export function WithSelection() {
  return (
    <div className="max-w-md">
      <PoolPicker
        selected={{ id: "pl_8f2a91", name: "Ski Trip '26", balanceCents: 124000, status: "OPEN" }}
        onChange={() => {}}
      />
    </div>
  )
}

export function CustomLabel() {
  return (
    <div className="max-w-md">
      <PoolPicker
        label="Target pool"
        selected={{ id: "pl_4c19de", name: "Brunch Crew", balanceCents: 18400, status: "OPEN" }}
        onChange={() => {}}
      />
    </div>
  )
}
