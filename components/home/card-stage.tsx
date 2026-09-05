"use client"

// Centerpiece: friends pool -> one shared virtual card. Every tap on the card
// pops another feed moment from the crew.
import { useRef, useState } from "react"
import { COLORS, dropletSvg, prefersReducedMotion } from "./fx"

const FEED = [
  "John spent $40 on gas",
  "Sarah spent $22 at Starbucks",
  "Mia covered groceries — $63",
  "Alex paid the Wi-Fi bill — $58",
  "Jay grabbed pizza night — $34",
  "Priya booked the Airbnb — $120",
  "Sam paid trivia entry — $10",
  "Dana stocked the fridge — $47",
]

export default function CardStage() {
  const [tapCount, setTapCount] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const onTap = () => {
    setTapCount((n) => n + 1)
    const wrap = wrapRef.current
    if (!wrap) return
    wrap.classList.remove("paid")
    void wrap.offsetWidth
    wrap.classList.add("paid")
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => wrap.classList.remove("paid"), 2000)
    if (!prefersReducedMotion()) {
      for (let i = 0; i < 4; i++) {
        const s = document.createElement("span")
        s.className = "bd bd-" + (i + 2)
        s.style.left = "calc(100% - 30px)"
        s.style.top = "-6px"
        s.innerHTML = dropletSvg(COLORS[i], 13)
        wrap.appendChild(s)
        setTimeout(() => s.remove(), 700)
      }
    }
  }

  return (
    <section className="card-sec">
      <div className="hp-wrap">
        {/*
          ⚠️ THE CARD IS NOT SHIPPED YET, and this section is deliberately not a
          "COMING SOON" sign. It is the clearest thing on the page and the reason
          people understand Pool in one look, so it stays a headline feature —
          but the copy is future tense about the card itself, which is the same
          rule the app holds itself to (POOL_CARD_COPY: future tense always, no
          dates, no money figures). The flag says NEXT UP rather than COMING
          SOON: honest about where it is, without reading as "come back later".
        */}
        <span className="beta-pill">NEXT UP</span>
        <h2>Friends pool together.</h2>
        <p className="card-lede">
          Everyone spends from the same shared balance. Next up: the Pool Card — one card the whole
          crew taps, so nobody has to front the bill and chase it down after.
        </p>
        <div className="stage">
          <div className="crew">
            <div className="avatars" aria-label="The crew: Ava, Jay, Mia, Sam and 4 more">
              <span className="av" style={{ background: "#4EC3F5" }}>A</span>
              <span className="av" style={{ background: "#FFCE3E" }}>J</span>
              <span className="av" style={{ background: "#FF77B0" }}>M</span>
              <span className="av" style={{ background: "#63C666" }}>S</span>
              <span className="av" style={{ background: "#FDFCF9" }}>+4</span>
            </div>
            <span className="crew-label">The crew pools in</span>
          </div>
          <div className="flow-lane" aria-hidden="true">
            <span className="flow f1">
              <span className="flowY">
                <svg width="32" viewBox="0 0 40 40"><use href="#coin" /></svg>
              </span>
            </span>
            <span className="flow f2">
              <span className="flowY">
                <svg width="25" viewBox="0 0 40 40"><use href="#coin" /></svg>
              </span>
            </span>
            <span className="flow f3">
              <span className="flowY">
                <svg width="20" viewBox="0 0 40 40"><use href="#coin" /></svg>
              </span>
            </span>
          </div>
          <div className="card-wrap" ref={wrapRef}>
            <button className="vcard" type="button" aria-label="The shared Pool card — click to try a tap" onClick={onTap}>
              <span className="vc-top">
                <span className="hp-bubble vc-brand" aria-hidden="true">
                  <span className="lt-b">P</span>
                  <span className="lt-y">O</span>
                  <span className="lt-p">O</span>
                  <span className="lt-g">L</span>
                </span>
                <svg viewBox="0 0 24 24" fill="none" stroke="#FDFCF9" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M5.5 10.2a2.6 2.6 0 0 1 0 3.6" />
                  <path d="M8.6 7.6a6.2 6.2 0 0 1 0 8.8" />
                  <path d="M11.7 5a9.8 9.8 0 0 1 0 14" />
                </svg>
              </span>
              <span className="vc-num">••••&nbsp;&nbsp;••••&nbsp;&nbsp;••••&nbsp;&nbsp;2468</span>
              <span className="vc-bottom">
                <span className="vc-name">THE BRUNCH CREW</span>
                <span className="vc-chip">SHARED ×8</span>
              </span>
              <svg className="vc-waves" viewBox="0 0 400 64" fill="none" aria-hidden="true">
                <path d="M0 22 Q 25 8 50 22 T 100 22 T 150 22 T 200 22 T 250 22 T 300 22 T 350 22 T 400 22" stroke="#4EC3F5" strokeWidth="9" />
                <path d="M0 38 Q 25 24 50 38 T 100 38 T 150 38 T 200 38 T 250 38 T 300 38 T 350 38 T 400 38" stroke="#FFCE3E" strokeWidth="9" />
                <path d="M0 54 Q 25 40 50 54 T 100 54 T 150 54 T 200 54 T 250 54 T 300 54 T 350 54 T 400 54" stroke="#FF77B0" strokeWidth="9" />
              </svg>
            </button>
            <span className="paid-chip">{tapCount === 0 ? "Paid — whole crew covered" : FEED[(tapCount - 1) % FEED.length]}</span>
            <span className="tap-hint">Go on — give the card a tap</span>
          </div>
        </div>
        <p className="just-line">
          <span className="hp-bubble">
            <span className="lt-b">Pool.</span> <span className="lt-y">Tap.</span> <span className="lt-p">Done.</span>
          </span>
        </p>
      </div>
      <span className="drift" data-speed="-0.06" style={{ left: "7%", top: "64%" }} aria-hidden="true">
        <span className="bob2" style={{ animationDelay: "-1.2s" }}>
          <svg width="20" viewBox="0 0 32 40">
            <use href="#dropletP" fill="#4EC3F5" stroke="#14224A" strokeWidth="3" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
      <span className="drift" data-speed="-0.09" style={{ right: "6%", top: "18%" }} aria-hidden="true">
        <span className="bob2" style={{ animationDelay: "-3s" }}>
          <svg width="44" viewBox="0 0 56 32" style={{ transform: "rotate(9deg)" }}>
            <use href="#bill" />
          </svg>
        </span>
      </span>
    </section>
  )
}
