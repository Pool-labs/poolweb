"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * The feed demo: a sticker-style phone frame auto-playing a ~12s loop of a
 * fake Pool feed ("Lake Weekend 🚤"). Shows the social layer instead of
 * claiming it. Cards animate in with transform/opacity; the loop pauses
 * offscreen and on tab hide; reduced-motion shows the full static feed
 * (handled in CSS — .feed-item is fully visible under reduced motion).
 */

// step index reached → what's visible; balance = pool total at that moment
const TIMELINE = [
  { at: 0, balance: 0 }, // Maya started Lake Weekend
  { at: 1600, balance: 150 }, // Jordan + Sam join (buy-ins land)
  { at: 3400, balance: 200 }, // Sam added $50
  { at: 5200, balance: 158 }, // Jordan tapped $42 at Shell
  { at: 6700, balance: 158 }, // reactions pop
  { at: 8200, balance: 40 }, // Maya tapped $118 at Kroger
  { at: 10000, balance: 40 }, // comment bubble
]
const LOOP_MS = 12600
const FINAL_STEP = TIMELINE.length - 1

function Avatar({ initial, color, className }: { initial: string; color: string; className?: string }) {
  return (
    <span
      className={cn(
        "w-7 h-7 rounded-full border-2 border-navy flex items-center justify-center text-xs font-bold text-navy shrink-0",
        color,
        className,
      )}
    >
      {initial}
    </span>
  )
}

export default function FeedDemo() {
  const frameRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(-1)
  const [balance, setBalance] = useState(0)
  const [reduced, setReduced] = useState(false)

  // Loop engine: 250ms heartbeat accumulates elapsed time only while active.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mq.matches) {
      setReduced(true)
      setStep(FINAL_STEP)
      setBalance(TIMELINE[FINAL_STEP].balance)
      return
    }

    const flags = { onscreen: true, tabVisible: true }
    const el = frameRef.current
    const io = new IntersectionObserver(([entry]) => (flags.onscreen = entry.isIntersecting), { threshold: 0.2 })
    if (el) io.observe(el)
    const onVis = () => (flags.tabVisible = document.visibilityState === "visible")
    document.addEventListener("visibilitychange", onVis)

    let elapsed = 0
    const interval = setInterval(() => {
      if (!flags.onscreen || !flags.tabVisible) return
      elapsed += 250
      if (elapsed >= LOOP_MS) {
        elapsed = 0
        setStep(-1)
        return
      }
      let next = -1
      for (let i = 0; i < TIMELINE.length; i++) if (elapsed >= TIMELINE[i].at + 600) next = i
      setStep((prev) => {
        if (next !== prev && next >= 0) setBalance(TIMELINE[next].balance)
        return next
      })
    }, 250)

    return () => {
      clearInterval(interval)
      io.disconnect()
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [])

  const shown = (n: number) => step >= n

  return (
    <div ref={frameRef} className="relative">
      {/* Text alternative for screen readers */}
      <p className="sr-only">
        Demo of a Pool feed: Maya started a pool called Lake Weekend. Jordan and Sam joined and the pool
        filled to $150. Sam added $50 more. Jordan tapped $42 at Shell and friends reacted with fire and
        fuel-pump emoji. Maya tapped $118 at Kroger with the note “we feast,” and Sam commented with boat emoji.
      </p>

      {/* Phone frame, drawn in the sticker style */}
      <div className="sticker rounded-[30px] p-2 w-[295px] sm:w-[315px] mx-auto shadow-[6px_6px_0_#14224A]" aria-hidden="true">
        <div className="rounded-[22px] border-2 border-navy bg-cloud overflow-hidden h-[560px] flex flex-col">
          {/* Status bar */}
          <div className="flex items-center justify-between px-4 pt-2 text-[10px] font-bold text-navy/70">
            <span>9:41</span>
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-navy/60" />
              <span className="w-1.5 h-1.5 rounded-full bg-navy/60" />
              <span className="w-1.5 h-1.5 rounded-full bg-navy/60" />
            </span>
          </div>

          {/* Pool header */}
          <div className="px-3 pt-2 pb-3 border-b-2 border-navy bg-white">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display font-bold text-navy text-lg leading-tight">🚤 Lake Weekend</span>
              <span className="chip-sticker bg-pool-green/25 text-[12px] tabular-nums">${balance}</span>
            </div>
            <div className="flex items-center mt-2">
              <Avatar initial="M" color="bg-pool-pink" />
              <span className={cn("feed-item -ml-2", shown(1) && "is-shown")}>
                <Avatar initial="J" color="bg-pool-blue" />
              </span>
              <span className={cn("feed-item -ml-2", shown(1) && "is-shown")}>
                <Avatar initial="S" color="bg-pool-yellow" />
              </span>
            </div>
          </div>

          {/* Feed */}
          <div className="flex-1 p-3 space-y-2.5 overflow-hidden bg-sky-tint/60">
            {/* 0 — pool started */}
            <div className={cn("feed-item text-center", shown(0) && "is-shown")}>
              <span className="inline-block rounded-full border-2 border-navy bg-pool-yellow/90 px-3 py-1 text-xs font-bold text-navy">
                Maya started Lake Weekend 🚤
              </span>
            </div>

            {/* 1 — joins */}
            <div className={cn("feed-item flex justify-center gap-2", shown(1) && "is-shown")}>
              <span className="chip-sticker text-xs">
                <Avatar initial="J" color="bg-pool-blue" className="w-5 h-5 text-[10px]" /> Jordan joined
              </span>
              <span className="chip-sticker text-xs">
                <Avatar initial="S" color="bg-pool-yellow" className="w-5 h-5 text-[10px]" /> Sam joined
              </span>
            </div>

            {/* 2 — Sam adds $50 */}
            <div className={cn("feed-item", shown(2) && "is-shown")}>
              <div className="rounded-2xl border-2 border-navy bg-white p-3 flex items-center gap-2.5">
                <Avatar initial="S" color="bg-pool-yellow" />
                <p className="text-sm font-medium text-navy flex-1">
                  <strong>Sam</strong> added <strong>$50</strong>
                </p>
                <span className="chip-sticker bg-pool-green/25 text-[11px]">+$50</span>
              </div>
            </div>

            {/* 3 — Jordan taps at Shell (+ 4 — reactions) */}
            <div className={cn("feed-item", shown(3) && "is-shown")}>
              <div className="rounded-2xl border-2 border-navy bg-white p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar initial="J" color="bg-pool-blue" />
                  <p className="text-sm font-medium text-navy flex-1">
                    <strong>Jordan</strong> tapped <strong>$42 at Shell</strong>
                  </p>
                </div>
                <div className="flex gap-1.5 mt-2 ml-9 h-6">
                  <span className={cn("feed-pop chip-sticker text-[11px] py-0", shown(4) && "is-shown")}>🔥 2</span>
                  <span
                    className={cn("feed-pop chip-sticker text-[11px] py-0", shown(4) && "is-shown")}
                    style={{ transitionDelay: "120ms" }}
                  >
                    ⛽ 1
                  </span>
                </div>
              </div>
            </div>

            {/* 5 — Maya taps at Kroger (+ 6 — comment) */}
            <div className={cn("feed-item", shown(5) && "is-shown")}>
              <div className="rounded-2xl border-2 border-navy bg-white p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar initial="M" color="bg-pool-pink" />
                  <p className="text-sm font-medium text-navy flex-1">
                    <strong>Maya</strong> tapped <strong>$118 at Kroger</strong>
                  </p>
                </div>
                <p className="ml-9 mt-1.5 text-xs font-medium text-navy/75 italic">“we feast”</p>
                <div className={cn("feed-pop ml-9 mt-2 flex items-center gap-2", shown(6) && "is-shown")}>
                  <Avatar initial="S" color="bg-pool-yellow" className="w-5 h-5 text-[10px]" />
                  <span className="rounded-full rounded-bl-none border-2 border-navy bg-sky-tint px-2.5 py-0.5 text-xs">
                    🚤🚤🚤
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Replay hint dots — purely decorative */}
      {!reduced && (
        <div className="flex justify-center gap-1.5 mt-4" aria-hidden="true">
          {TIMELINE.map((_, i) => (
            <span
              key={i}
              className={cn(
                "w-2 h-2 rounded-full border-2 border-navy transition-colors",
                step >= i ? "bg-pool-blue" : "bg-white",
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
