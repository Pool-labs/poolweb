import { Chip } from "my-v0-project"

// Small pill: 2px navy border, white fill, bold 13px navy text.
export function Default() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Chip>Brunch</Chip>
      <Chip>Ski trip</Chip>
      <Chip>Rent</Chip>
      <Chip>Game night</Chip>
    </div>
  )
}

export function WithEmoji() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Chip>🥞 Brunch Crew</Chip>
      <Chip>🎿 Ski Trip &rsquo;26</Chip>
      <Chip>🏠 Apartment 4B</Chip>
    </div>
  )
}

export function Tinted() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Chip className="bg-pool-yellow">12 in</Chip>
      <Chip className="bg-pool-blue">$240 pooled</Chip>
      <Chip className="bg-pool-pink">New</Chip>
    </div>
  )
}
