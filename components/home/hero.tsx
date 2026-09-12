"use client"

// Hero: the pool logo you can toss a coin into, headline, and the two real
// CTAs. The rainbow falls frame it on both sides.
import Link from "next/link"
import { useRef, type CSSProperties } from "react"
import Falls from "./falls"
import { COLORS, coinSvg, dropletSvg, prefersReducedMotion } from "./fx"

export default function Hero() {
  const tossRef = useRef<HTMLButtonElement>(null)

  const onToss = () => {
    const toss = tossRef.current
    if (!toss || prefersReducedMotion()) return
    const c = document.createElement("span")
    c.className = "toss-coin"
    c.style.left = 32 + Math.random() * 36 + "%"
    c.innerHTML = coinSvg(30)
    toss.appendChild(c)
    setTimeout(() => {
      c.remove()
      for (let i = 0; i < 3; i++) {
        const d = document.createElement("span")
        d.className = "toss-drop td-" + (i + 1)
        d.innerHTML = dropletSvg(COLORS[i], 11)
        toss.appendChild(d)
        setTimeout(() => d.remove(), 620)
      }
    }, 560)
  }

  return (
    <section className="hero">
      <Falls />
      <div className="hp-wrap">
        <button
          ref={tossRef}
          className="hero-logo pop"
          type="button"
          aria-label="Toss a coin into the pool"
          title="Toss a coin in!"
          onClick={onToss}
        >
          <img
            src="/images/pool-logo-new.png"
            alt="Pool — money splashing into a three-ring kiddie pool"
            width={440}
            height={440}
          />
          <svg className="hero-coin hc-1 bob" style={{ "--r": "-14deg" } as CSSProperties} viewBox="0 0 40 40" aria-hidden="true">
            <use href="#coin" />
          </svg>
          <svg className="hero-coin hc-2 bob bob-2" style={{ "--r": "16deg" } as CSSProperties} viewBox="0 0 40 40" aria-hidden="true">
            <use href="#coin" />
          </svg>
          <svg className="hero-coin hc-3 bob bob-3" style={{ "--r": "-8deg" } as CSSProperties} viewBox="0 0 40 40" aria-hidden="true">
            <use href="#coin" />
          </svg>
        </button>
        <h1 className="rise">Pool. Tap. Done.</h1>
        <p className="sub rise-2">A social network for people who spend time — and money — together.</p>
        <div className="cta-row rise-2">
          <Link className="hp-btn hp-btn-pink" href="/download">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" />
            </svg>
            Get the app
          </Link>
          <Link className="hp-btn hp-btn-green" href="/faq">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.3" />
              <circle cx="12" cy="17" r="1" fill="#fff" stroke="none" />
            </svg>
            How Pool works
          </Link>
        </div>
      </div>
    </section>
  )
}
