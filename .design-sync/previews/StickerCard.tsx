import { StickerCard, Chip } from "my-v0-project"

// The sticker card: 2.5px navy border, hard 4px offset shadow, 16px radius.
export function Default() {
  return (
    <StickerCard className="max-w-sm p-6">
      <h3 className="font-display text-2xl font-extrabold">Brunch Crew</h3>
      <p className="mt-2 text-sm opacity-80">
        Five people, every Sunday. No IOUs, no awkward math.
      </p>
    </StickerCard>
  )
}

export function Interactive() {
  return (
    <StickerCard interactive className="max-w-sm cursor-pointer p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl font-extrabold">Ski Trip &rsquo;26</h3>
        <Chip>12 in</Chip>
      </div>
      <p className="mt-2 text-sm opacity-80">Hover me — the sticker lifts off the page.</p>
    </StickerCard>
  )
}

export function Tinted() {
  return (
    <div className="flex flex-wrap gap-4">
      <StickerCard className="w-44 bg-pool-yellow p-5 text-center font-display text-xl font-extrabold">
        $2,480
      </StickerCard>
      <StickerCard className="w-44 bg-pool-blue p-5 text-center font-display text-xl font-extrabold">
        6 people
      </StickerCard>
    </div>
  )
}
