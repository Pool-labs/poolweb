// The navy ticker banner: what's happening on Pool. Pure CSS marquee — the
// track is duplicated once and translates -50% in a seamless loop.
const ITEMS: Array<{ text: string; sep: "coin" | "dropBlue" | "dropPink" | "bill" }> = [
  { text: "Nearby: trivia night at Felix's — 3 pools forming", sep: "coin" },
  { text: "Brunch Crew pooled $240 in 12 seconds", sep: "dropBlue" },
  { text: "Ski Trip '26 — 12 friends planning, one shared card", sep: "bill" },
  { text: "Apartment 4B — rent day, one tap", sep: "dropPink" },
  { text: "Dana's birthday fund just hit its goal", sep: "coin" },
  { text: "Nearby: Cardinals game — pool with your section", sep: "dropBlue" },
  { text: "Coffee run — Ava tapped. Done.", sep: "bill" },
]

function Sep({ kind }: { kind: (typeof ITEMS)[number]["sep"] }) {
  if (kind === "coin")
    return (
      <svg width="17" viewBox="0 0 40 40">
        <use href="#coin" />
      </svg>
    )
  if (kind === "bill")
    return (
      <svg width="24" viewBox="0 0 56 32">
        <use href="#bill" />
      </svg>
    )
  return (
    <svg width="12" viewBox="0 0 32 40">
      <use href="#dropletP" fill={kind === "dropPink" ? "#FF77B0" : "#4EC3F5"} stroke="#FDFCF9" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  )
}

function Track({ hidden }: { hidden?: boolean }) {
  return (
    <div className="hp-tk" aria-hidden={hidden || undefined}>
      {ITEMS.map((item) => (
        <span key={item.text} style={{ display: "contents" }}>
          <span className="hp-tk-item">{item.text}</span>
          <span className="hp-tk-sep">
            <Sep kind={item.sep} />
          </span>
        </span>
      ))}
    </div>
  )
}

export default function HomeTicker() {
  return (
    <section className="ticker-sec" aria-label="What's happening on Pool">
      <div className="hp-ticker">
        <div className="hp-ticker-track">
          <Track />
          <Track hidden />
        </div>
        <div className="hp-ticker-stripe" />
      </div>
    </section>
  )
}
