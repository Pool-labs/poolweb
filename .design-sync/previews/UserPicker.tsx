import { UserPicker } from "my-v0-project"

const SELECTED = [
  { id: "usr_9a3f21", name: "Maya Okafor", email: "maya@poolapp.co" },
  { id: "usr_1c8e04", name: "Priya Raman", email: "priya@poolapp.co" },
  { id: "usr_44b2aa", name: "Sam Delgado", email: null },
]

// Search-and-select for users. `email` may be null; `selected` drives the chips.
export function Empty() {
  return (
    <div className="max-w-md">
      <UserPicker label="Recipients" selected={[]} onChange={() => {}} hint="Search by email, username, or name." />
    </div>
  )
}

export function WithSelection() {
  return (
    <div className="max-w-md">
      <UserPicker label="Recipients" selected={SELECTED} onChange={() => {}} />
    </div>
  )
}

export function AllowAddAll() {
  return (
    <div className="max-w-md">
      <UserPicker
        label="Broadcast audience"
        selected={SELECTED.slice(0, 1)}
        onChange={() => {}}
        allowAddAll
        hint="Add-all selects every user in the environment."
      />
    </div>
  )
}
