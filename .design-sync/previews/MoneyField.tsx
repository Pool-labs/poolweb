import { MoneyField } from "my-v0-project"

// Dollars in, INTEGER CENTS out — the parsed value is echoed back so the
// operator sees exactly what will be sent.
export function Valid() {
  return (
    <div className="max-w-sm">
      <MoneyField id="amt-ok" label="Amount" value="12.34" onChange={() => {}} />
    </div>
  )
}

export function Invalid() {
  return (
    <div className="max-w-sm">
      <MoneyField id="amt-bad" label="Amount" value="12.3.4" onChange={() => {}} />
    </div>
  )
}

export function Empty() {
  return (
    <div className="max-w-sm">
      <MoneyField id="amt-empty" label="Amount" value="" onChange={() => {}} hint="Leave blank to skip the deposit." />
    </div>
  )
}
