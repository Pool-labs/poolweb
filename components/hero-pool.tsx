"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { StickerButton } from "@/components/sticker"

/**
 * The signature hero: an interactive three-ring pool scene.
 *
 * - Static SVG scene renders on the server (zero layout shift on hydration).
 * - Ambient loop: a bill flutters down every few seconds (occasionally a coin),
 *   lands with a splash; droplets arc out. WAAPI on transform/opacity only.
 * - Clicking/tapping anywhere in the hero tosses a coin from the click point
 *   into the pool; the coin stays (pile capped at 30, oldest recycled).
 * - Everything pauses offscreen (IntersectionObserver) and on tab hide.
 * - prefers-reduced-motion: full static scene, no loop; clicks still add coins.
 */

const NS = "http://www.w3.org/2000/svg"
const PILE_CAP = 30
const MAX_AMBIENT = 6
const MAX_TOSS = 4

// Water surface span (scene coordinates) where money can rest.
const WATER = { minX: 150, maxX: 350, minY: 240, maxY: 274 }

type PileCoin = { id: number; x: number; y: number; rot: number; scale: number }

// Deterministic starting pile — rendered on the server, never randomized.
const INITIAL_BILLS: Array<[number, number, number]> = [
  [150, 246, -8],
  [205, 258, 5],
  [262, 244, -3],
  [312, 256, 9],
  [178, 268, 14],
  [285, 270, -12],
  [238, 252, 2],
]
const INITIAL_COINS: Array<[number, number, number]> = [
  [168, 240, 0.9],
  [232, 266, 1],
  [300, 238, 0.85],
  [338, 260, 0.95],
  [206, 236, 0.8],
  [270, 256, 0.9],
]

let coinId = 100

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

export default function HeroPool() {
  const sectionRef = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const dynamicRef = useRef<SVGGElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [pile, setPile] = useState<PileCoin[]>([])

  // Live flags kept in a ref so the scheduler never re-subscribes.
  const flags = useRef({ onscreen: true, tabVisible: true, reduced: false })
  const liveAnimations = useRef(new Set<Animation>())
  const tossCount = useRef(0)

  const isActive = () =>
    flags.current.onscreen && flags.current.tabVisible && !flags.current.reduced

  const track = useCallback((el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    const anim = el.animate(keyframes, options)
    liveAnimations.current.add(anim)
    anim.finished
      .catch(() => {})
      .finally(() => liveAnimations.current.delete(anim))
    return anim
  }, [])

  const spawnSplash = useCallback(
    (x: number, y: number) => {
      const layer = dynamicRef.current
      if (!layer) return
      const g = document.createElementNS(NS, "g")
      const use = document.createElementNS(NS, "use")
      use.setAttribute("href", "#splash-def")
      g.setAttribute("transform", `translate(${x} ${y})`)
      use.style.transformBox = "fill-box"
      use.style.transformOrigin = "50% 100%"
      g.appendChild(use)
      layer.appendChild(g)
      track(use, [
        { transform: "scale(0.4)", opacity: 1 },
        { transform: "scale(1.1)", opacity: 0.9, offset: 0.55 },
        { transform: "scale(1.25)", opacity: 0 },
      ], { duration: 450, easing: "ease-out", fill: "forwards" }).finished
        .catch(() => {})
        .finally(() => g.remove())

      // Two droplets arcing out of the splash point
      for (const dir of [-1, 1]) {
        const dg = document.createElementNS(NS, "g")
        const du = document.createElementNS(NS, "use")
        du.setAttribute("href", "#droplet-def")
        dg.setAttribute("transform", `translate(${x} ${y - 6})`)
        du.style.transformBox = "fill-box"
        du.style.transformOrigin = "center"
        dg.appendChild(du)
        layer.appendChild(dg)
        const dx = dir * rand(18, 30)
        track(du, [
          { transform: "translate(0px, 0px) scale(0.9)", opacity: 1 },
          { transform: `translate(${dx * 0.7}px, -${rand(22, 32)}px) scale(0.75)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${dx}px, 2px) scale(0.5)`, opacity: 0 },
        ], { duration: 520, easing: "ease-out", fill: "forwards" }).finished
          .catch(() => {})
          .finally(() => dg.remove())
      }
    },
    [track],
  )

  const spawnAmbient = useCallback(() => {
    const layer = dynamicRef.current
    if (!layer || layer.childElementCount > MAX_AMBIENT) return
    const isBill = Math.random() < 0.7
    const x = rand(WATER.minX, WATER.maxX - (isBill ? 52 : 0))
    const landY = rand(WATER.minY, WATER.maxY)

    const g = document.createElementNS(NS, "g")
    const use = document.createElementNS(NS, "use")
    use.setAttribute("href", isBill ? "#bill-def" : "#coin-def")
    use.style.transformBox = "fill-box"
    use.style.transformOrigin = "center"
    g.appendChild(use)
    layer.appendChild(g)

    const fall = isBill
      ? track(g, [
          { transform: `translate(${x}px, -40px)` },
          { transform: `translate(${x - 16}px, ${(-40 + landY) * 0.35}px)`, offset: 0.35 },
          { transform: `translate(${x + 13}px, ${(-40 + landY) * 0.7}px)`, offset: 0.7 },
          { transform: `translate(${x}px, ${landY}px)` },
        ], { duration: 2300, easing: "ease-in", fill: "forwards" })
      : track(g, [
          { transform: `translate(${x}px, -30px)` },
          { transform: `translate(${x}px, ${landY}px)`, offset: 0.82 },
          { transform: `translate(${x}px, ${landY - 8}px)`, offset: 0.92 },
          { transform: `translate(${x}px, ${landY}px)` },
        ], { duration: 950, easing: "ease-in", fill: "forwards" })

    if (isBill) {
      track(use, [
        { transform: "rotate(-11deg)" },
        { transform: "rotate(9deg)", offset: 0.4 },
        { transform: "rotate(-7deg)", offset: 0.75 },
        { transform: "rotate(3deg)" },
      ], { duration: 2300, easing: "ease-in-out", fill: "forwards" })
    }

    fall.finished
      .then(() => {
        spawnSplash(x + (isBill ? 26 : 20), landY + (isBill ? 16 : 22))
        return track(g, [{ opacity: 1 }, { opacity: 0 }], {
          duration: 600,
          delay: 350,
          easing: "ease-out",
          fill: "forwards",
        }).finished
      })
      .catch(() => {})
      .finally(() => g.remove())
  }, [spawnSplash, track])

  // Ambient scheduler + pause/visibility wiring
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    flags.current.reduced = mq.matches
    const onMq = () => {
      flags.current.reduced = mq.matches
    }
    mq.addEventListener("change", onMq)

    const syncPause = () => {
      const running = flags.current.onscreen && flags.current.tabVisible
      section.classList.toggle("anim-paused", !running)
      liveAnimations.current.forEach((a) => (running ? a.play() : a.pause()))
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        flags.current.onscreen = entry.isIntersecting
        syncPause()
      },
      { threshold: 0.05 },
    )
    io.observe(section)

    const onVis = () => {
      flags.current.tabVisible = document.visibilityState === "visible"
      syncPause()
    }
    document.addEventListener("visibilitychange", onVis)

    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(() => {
        if (isActive()) spawnAmbient()
        schedule()
      }, rand(2600, 4400))
    }
    schedule()

    return () => {
      clearTimeout(timer)
      io.disconnect()
      document.removeEventListener("visibilitychange", onVis)
      mq.removeEventListener("change", onMq)
    }
  }, [spawnAmbient])

  const addToPile = useCallback((x: number, y: number) => {
    setPile((prev) => {
      const next: PileCoin = { id: coinId++, x, y, rot: rand(-15, 15), scale: rand(0.8, 1) }
      return prev.length >= PILE_CAP ? [...prev.slice(1), next] : [...prev, next]
    })
  }, [])

  const handleToss = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const section = sectionRef.current
      const svg = svgRef.current
      const overlay = overlayRef.current
      if (!section || !svg || !overlay) return
      if ((e.target as Element).closest("a, button")) return

      // Landing slot in scene coordinates
      const sx = rand(WATER.minX + 10, WATER.maxX - 10)
      const sy = rand(WATER.minY, WATER.maxY)

      if (flags.current.reduced) {
        addToPile(sx, sy)
        return
      }
      if (tossCount.current >= MAX_TOSS) return
      tossCount.current++

      // Map the scene slot into hero-local pixels for the overlay flight
      const ctm = svg.getScreenCTM()
      const sectionBox = section.getBoundingClientRect()
      if (!ctm) {
        tossCount.current--
        addToPile(sx, sy)
        return
      }
      const pt = new DOMPoint(sx, sy).matrixTransform(ctm)
      const endX = pt.x - sectionBox.left
      const endY = pt.y - sectionBox.top
      const startX = e.clientX - sectionBox.left
      const startY = e.clientY - sectionBox.top

      // Nested wrappers: outer = X (linear), mid = Y (arc), inner = spin
      const outer = document.createElement("div")
      outer.className = "absolute top-0 left-0 w-7 h-7"
      const mid = document.createElement("div")
      const inner = document.createElement("div")
      inner.innerHTML =
        '<svg viewBox="0 0 40 40" width="28" height="28" aria-hidden="true"><circle cx="20" cy="20" r="16.5" fill="#F5B63C" stroke="#14224A" stroke-width="3"/><circle cx="20" cy="20" r="11" fill="#FFD66B" stroke="#14224A" stroke-width="2"/></svg>'
      mid.appendChild(inner)
      outer.appendChild(mid)
      overlay.appendChild(outer)

      const duration = 650
      const lift = Math.max(70, (startY - endY) * 0.4 + 90)
      const ax = track(outer, [
        { transform: `translateX(${startX - 14}px)` },
        { transform: `translateX(${endX - 14}px)` },
      ], { duration, easing: "linear", fill: "forwards" })
      track(mid, [
        { transform: `translateY(${startY - 14}px)`, easing: "cubic-bezier(0.25, 0.1, 0.4, 1)" },
        { transform: `translateY(${Math.min(startY, endY) - 14 - lift}px)`, offset: 0.45, easing: "cubic-bezier(0.6, 0, 0.75, 0.9)" },
        { transform: `translateY(${endY - 14}px)` },
      ], { duration, fill: "forwards" })
      track(inner, [
        { transform: "rotate(0deg) scale(1)" },
        { transform: `rotate(${rand(180, 420)}deg) scale(0.72)` },
      ], { duration, easing: "ease-out", fill: "forwards" })

      ax.finished
        .then(() => {
          addToPile(sx, sy)
          spawnSplash(sx, sy + 4)
        })
        .catch(() => {})
        .finally(() => {
          outer.remove()
          tossCount.current--
        })
    },
    [addToPile, spawnSplash, track],
  )

  return (
    <section
      ref={sectionRef}
      onPointerDown={handleToss}
      className="relative overflow-hidden cursor-pointer select-none"
      style={{
        background:
          "radial-gradient(ellipse 70% 55% at 50% 38%, rgba(255, 206, 62, 0.13), transparent 70%)",
      }}
      aria-label="Pool — a shared pool your whole crew spends from. Tap anywhere to toss a coin in."
    >
      <div className="container mx-auto px-4 pt-10 pb-14 sm:pt-14 lg:pt-20 lg:pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-12 items-center">
        <div className="text-center lg:text-left relative z-10">
          <h1 className="font-display font-extrabold leading-[1.05] text-5xl sm:text-6xl lg:text-7xl xl:text-8xl">
            <span className="text-sticker text-pool-blue">Pool.</span>{" "}
            <span className="text-sticker text-pool-yellow">Tap.</span>{" "}
            <span className="text-sticker text-pool-pink">Done.</span>
          </h1>
          {/* Approved line — keep verbatim. */}
          <p className="mt-6 text-lg sm:text-xl lg:text-2xl text-navy font-medium max-w-xl mx-auto lg:mx-0 text-balance">
            A social network for people who spend time — and money — together.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
            <StickerButton href="/preregister" variant="pink" className="text-lg px-8 py-3.5">
              Pre-register for the beta
            </StickerButton>
            <StickerButton href="#how-it-works" variant="ghost" className="text-lg px-6 py-3.5">
              See how it works
            </StickerButton>
          </div>
          <p className="mt-6 text-sm text-navy/60 hidden sm:block" aria-hidden="true">
            psst — click anywhere to toss a coin in
          </p>
        </div>

        <div className="relative">
          <svg
            ref={svgRef}
            viewBox="0 0 520 430"
            className="w-full max-w-[560px] mx-auto"
            role="img"
            aria-label="A three-ring kiddie pool — blue, yellow and pink — full of dollar bills and gold coins, money splashing in"
          >
            <defs>
              <g id="bill-def">
                <rect x="0" y="0" width="52" height="28" rx="5" fill="#63C666" stroke="#14224A" strokeWidth="3" />
                <rect x="5.5" y="5" width="41" height="18" rx="2.5" fill="none" stroke="#14224A" strokeWidth="1.8" />
                <circle cx="26" cy="14" r="7" fill="#8FDC92" stroke="#14224A" strokeWidth="2" />
              </g>
              <g id="coin-def">
                <circle cx="20" cy="20" r="16.5" fill="#F5B63C" stroke="#14224A" strokeWidth="3" />
                <circle cx="20" cy="20" r="11" fill="#FFD66B" stroke="#14224A" strokeWidth="2" />
              </g>
              <g id="splash-def" transform="translate(-24 -46)">
                <path
                  d="M20 46C18.5 38 18.5 31 20.5 25C13 21 6.5 12.5 5 3.5C11 9.5 18 14.5 23 16.5C23.6 16.7 24.4 16.7 25 16.5C30 14.5 37 9.5 43 3.5C41.5 12.5 35 21 27.5 25C29.5 31 29.5 38 28 46C25.5 41 22.5 41 20 46Z"
                  fill="#4EC3F5"
                  stroke="#14224A"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
              </g>
              <g id="droplet-def" transform="translate(-8 -10)">
                <path
                  d="M8 1.5C8 1.5 2.5 8.5 2.5 13a5.5 5.5 0 0 0 11 0C13.5 8.5 8 1.5 8 1.5Z"
                  fill="#4EC3F5"
                  stroke="#14224A"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </g>
            </defs>

            {/* Sky */}
            <g className="cloud-drift" opacity="0.95">
              <path
                d="M58 72a14 14 0 0 1-3.5-27.5A17 17 0 0 1 87 38a13 13 0 0 1 17 12.5A11 11 0 0 1 100 72H58Z"
                fill="#fff" stroke="#14224A" strokeWidth="3.5" strokeLinejoin="round"
              />
            </g>
            <g className="cloud-drift-slow" opacity="0.95">
              <path
                d="M398 56a12 12 0 0 1-3-23.5A14.5 14.5 0 0 1 423 27a11 11 0 0 1 14.5 10.5A9.5 9.5 0 0 1 434 56h-36Z"
                fill="#fff" stroke="#14224A" strokeWidth="3.5" strokeLinejoin="round"
              />
            </g>
            <g className="cloud-drift" opacity="0.75">
              <path
                d="M224 108a9 9 0 0 1-2.2-17.6A11 11 0 0 1 243 86a8 8 0 0 1 10.5 7.6A7 7 0 0 1 251 108h-27Z"
                fill="#fff" stroke="#14224A" strokeWidth="3" strokeLinejoin="round"
              />
            </g>

            {/* Pool rings (pink base → yellow → blue) */}
            <ellipse cx="260" cy="344" rx="204" ry="58" fill="#FF77B0" stroke="#14224A" strokeWidth="7" />
            <ellipse cx="260" cy="308" rx="193" ry="54" fill="#FFCE3E" stroke="#14224A" strokeWidth="7" />
            <ellipse cx="260" cy="272" rx="182" ry="51" fill="#4EC3F5" stroke="#14224A" strokeWidth="7" />
            <ellipse cx="260" cy="266" rx="144" ry="31" fill="#B7E6FB" stroke="#14224A" strokeWidth="4" />

            {/* Money pile on the water */}
            <g>
              {INITIAL_BILLS.map(([x, y, r], i) => (
                <use key={`b${i}`} href="#bill-def" transform={`translate(${x} ${y}) rotate(${r} 26 14)`} />
              ))}
              {INITIAL_COINS.map(([x, y, s], i) => (
                <use key={`c${i}`} href="#coin-def" transform={`translate(${x} ${y}) scale(${s})`} />
              ))}
            </g>

            {/* Coins tossed in by visitors — they stay */}
            <g>
              {pile.map((c) => (
                <use
                  key={c.id}
                  href="#coin-def"
                  transform={`translate(${c.x - 20 * c.scale} ${c.y - 20 * c.scale}) scale(${c.scale}) rotate(${c.rot} 20 20)`}
                />
              ))}
            </g>

            {/* The splash + mid-air money (mirrors the primary logo mark) */}
            <use href="#splash-def" transform="translate(258 252) scale(1.7)" />
            <g className="air-bob">
              <use href="#bill-def" transform="translate(178 128) rotate(-24 26 14) scale(0.95)" />
              <use href="#bill-def" transform="translate(296 100) rotate(18 26 14) scale(0.85)" />
              <use href="#coin-def" transform="translate(348 152) scale(0.8)" />
              <use href="#coin-def" transform="translate(148 168) scale(0.65)" />
              <use href="#droplet-def" transform="translate(160 210) scale(1.1)" />
              <use href="#droplet-def" transform="translate(372 196) scale(0.9)" />
            </g>

            {/* Ambient falls, tossed-coin splashes */}
            <g ref={dynamicRef} />
          </svg>
        </div>
      </div>

      {/* Overlay layer for coins in flight (hero-local pixel space) */}
      <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true" />
    </section>
  )
}
