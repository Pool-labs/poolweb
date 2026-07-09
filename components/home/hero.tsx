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
          <Link className="hp-btn hp-btn-pink" href="/preregister">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l1.9 5.8L20 10l-5.4 2.6L12 19l-2.6-6.4L4 10l6.1-1.2z" />
            </svg>
            Pre-register for Beta
          </Link>
          <Link className="hp-btn hp-btn-green" href="/questionnaire">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="5" y="4" width="14" height="17" rx="2" />
              <path d="M9 4.5V3h6v1.5M9 10h6M9 14h6" />
            </svg>
            Questionnaire
          </Link>
        </div>
      </div>
    </section>
  )
}
