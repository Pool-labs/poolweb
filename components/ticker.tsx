"use client"

import { useEffect, useRef } from "react"

/**
 * Transaction ticker — slim CSS marquee under the hero.
 * Duplicated track + translate3d; pauses on hover (CSS), offscreen
 * (IntersectionObserver) and for prefers-reduced-motion (CSS).
 */

const entries = [
  "Beach House — Alex tapped $63 at Costco",
  "Coffee Run — Priya tapped $11",
  "Ski Trip — Sam added $200",
  "Apt 4B — rent day, everyone's in",
  "Dana's Gift — goal reached",
]

function Track() {
  return (
    <>
      {entries.map((entry, i) => (
        <span key={i} className="flex items-center whitespace-nowrap">
          <span className="mx-5">{entry}</span>
          <svg viewBox="0 0 32 40" width="11" height="14" aria-hidden="true" className="opacity-70 shrink-0">
            <path
              d="M16 3C16 3 5 17 5 26a11 11 0 0 0 22 0C27 17 16 3 16 3Z"
              fill="#4EC3F5"
              stroke="#FDFCF9"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      ))}
    </>
  )
}

export default function Ticker() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => el.classList.toggle("ticker-paused", !entry.isIntersecting),
      { threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section ref={ref} aria-label="Sample pool activity" className="bg-navy text-cloud border-y-2 border-navy">
      {/* Static text alternative for screen readers */}
      <p className="sr-only">{entries.join(" · ")}</p>
      <div className="overflow-hidden py-2.5 font-semibold text-sm sm:text-[15px]" aria-hidden="true">
        <div className="ticker-track">
          <Track />
          <Track />
        </div>
      </div>
    </section>
  )
}
