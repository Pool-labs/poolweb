import { IdList } from "my-v0-project"

export function Short() {
  return (
    <div className="max-w-sm">
      <IdList label="Pool ids" ids={["pl_8f2a91", "pl_4c19de", "pl_77bd03"]} />
    </div>
  )
}

export function Scrollable() {
  return (
    <div className="max-w-sm">
      <IdList
        label="Recipient ids"
        ids={Array.from({ length: 24 }, (_, i) => `usr_${(i + 1).toString(16).padStart(6, "0")}`)}
      />
    </div>
  )
}
