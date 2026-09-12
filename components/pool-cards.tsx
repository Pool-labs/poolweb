import { cn } from "@/lib/utils"

/**
 * "WTF Is Pool?!" — three pools styled like actual pools from the app,
 * slapped on the page like stickers (slight scattered rotation).
 * All names/amounts are the brief's sample data.
 */

type Member = { initial: string; color: string }

const avatarColors = {
  blue: "bg-pool-blue",
  yellow: "bg-pool-yellow",
  pink: "bg-pool-pink",
  green: "bg-pool-green",
}

const pools: Array<{
  name: string
  balance: string
  members: Member[]
  extra?: string
  feedLine: string
  rotate: string
  accent: string
}> = [
  {
    name: "Brunch Crew",
    balance: "$184",
    members: [
      { initial: "M", color: avatarColors.pink },
      { initial: "J", color: avatarColors.blue },
      { initial: "P", color: avatarColors.yellow },
    ],
    extra: "+2",
    feedLine: "Maya tapped $42 at First Watch",
    rotate: "md:-rotate-2",
    accent: "bg-pool-blue",
  },
  {
    name: "Ski Trip '26",
    balance: "$1,240",
    members: [
      { initial: "S", color: avatarColors.green },
      { initial: "A", color: avatarColors.blue },
      { initial: "D", color: avatarColors.pink },
    ],
    extra: "+3",
    feedLine: "Sam added $200 — lift tickets locked",
    rotate: "md:rotate-1",
    accent: "bg-pool-yellow",
  },
  {
    name: "Apartment 4B",
    balance: "$960",
    members: [
      { initial: "A", color: avatarColors.yellow },
      { initial: "D", color: avatarColors.green },
      { initial: "M", color: avatarColors.blue },
    ],
    feedLine: "Rent day — everyone's in",
    rotate: "md:-rotate-1",
    accent: "bg-pool-pink",
  },
]

export default function PoolCards() {
  return (
    <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
      {pools.map((pool) => (
        <div
          key={pool.name}
          className={cn("sticker sticker-interactive p-5 bg-white", pool.rotate)}
        >
          <div className={cn("h-2.5 rounded-full border-2 border-navy mb-4", pool.accent)} aria-hidden="true" />
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-bold text-xl text-navy">{pool.name}</h3>
            <span className="chip-sticker bg-pool-green/20 shrink-0">{pool.balance}</span>
          </div>
          <div className="flex items-center mt-3">
            {pool.members.map((m, i) => (
              <span
                key={i}
                className={cn(
                  "w-9 h-9 rounded-full border-2 border-navy flex items-center justify-center text-sm font-bold text-navy",
                  m.color,
                  i > 0 && "-ml-2.5",
                )}
              >
                {m.initial}
              </span>
            ))}
            {pool.extra && (
              <span className="w-9 h-9 rounded-full border-2 border-navy border-dashed flex items-center justify-center text-xs font-bold text-navy/70 -ml-2.5 bg-white">
                {pool.extra}
              </span>
            )}
          </div>
          <p className="mt-4 rounded-xl border-2 border-navy bg-sky-tint px-3 py-2.5 text-sm font-medium text-navy">
            {pool.feedLine}
          </p>
        </div>
      ))}
    </div>
  )
}
