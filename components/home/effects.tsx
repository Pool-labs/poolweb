"use client"

// Homepage-wide behaviors ported from the approved mockup: springy scroll
// reveals, parallax drifters, the falls dissolving past the hero, and a
// droplet burst on every button press. Renders nothing.
import { useEffect } from "react"
import { COLORS, dropletSvg, prefersReducedMotion } from "./fx"

const REVEAL_SELECTOR = [
  ".hp .feature",
  ".hp .step",
  ".hp .wtf h2",
  ".hp .how h2",
  ".hp .jump h2",
  ".hp .jump .hp-wrap > p",
  ".hp .card-sec h2",
  ".hp .card-lede",
  ".hp .stage",
  ".hp .just-line",
  ".hp .social-sec h2",
  ".hp .social-sec .lede",
  ".hp .contrast-col",
  ".hp .bridge",
].join(", ")

export default function HomeEffects() {
  useEffect(() => {
    const reduced = prefersReducedMotion()
    document.documentElement.classList.add("hp-js")

    // scroll reveals
    const rvEls = document.querySelectorAll(REVEAL_SELECTOR)
    rvEls.forEach((el) => el.classList.add("rv"))
    let io: IntersectionObserver | null = null
    if (reduced || !("IntersectionObserver" in window)) {
      rvEls.forEach((el) => el.classList.add("in"))
    } else {
      io = new IntersectionObserver(
        (es) =>
          es.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("in")
              io!.unobserve(e.target)
            }
          }),
        { threshold: 0.18 },
      )
      rvEls.forEach((el) => io!.observe(el))
    }

    // parallax drifters + the falls dissolve as you scroll past the hero
    const drifters = [...document.querySelectorAll<HTMLElement>(".hp .drift")]
    const falls = [...document.querySelectorAll<HTMLElement>(".hp .falls")]
    let queued = false
    const apply = () => {
      const y = scrollY
      drifters.forEach((d) => {
        d.style.transform = "translateY(" + (y * parseFloat(d.dataset.speed || "-0.08")).toFixed(1) + "px)"
      })
      const fade = Math.max(0, 1 - Math.max(0, y - 300) / 260)
      falls.forEach((f) => {
        f.style.opacity = fade.toFixed(3)
      })
      queued = false
    }
    const onScroll = () => {
      if (!queued) {
        queued = true
        requestAnimationFrame(apply)
      }
    }
    if (!reduced) {
      addEventListener("scroll", onScroll, { passive: true })
      apply()
    }

    // droplet burst on every button/pill press
    const onPointerDown = (ev: PointerEvent) => {
      if (reduced) return
      const btn = (ev.target as Element).closest?.(".hp-btn, .hp-pill")
      if (!btn || !btn.closest(".hp")) return
      const r = btn.getBoundingClientRect()
      for (let i = 0; i < 5; i++) {
        const s = document.createElement("span")
        s.className = "bd bd-" + (i + 1)
        s.style.left = ev.clientX - r.left - 6 + "px"
        s.style.top = ev.clientY - r.top - 8 + "px"
        s.innerHTML = dropletSvg(COLORS[i % COLORS.length], 12)
        btn.appendChild(s)
        setTimeout(() => s.remove(), 700)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)

    return () => {
      document.documentElement.classList.remove("hp-js")
      io?.disconnect()
      removeEventListener("scroll", onScroll)
      document.removeEventListener("pointerdown", onPointerDown)
    }
  }, [])

  return null
}
