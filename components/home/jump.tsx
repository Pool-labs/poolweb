// Ready to Jump In? — final CTA with the droplet fan.
import Link from "next/link"

export default function Jump() {
  return (
    <section className="jump">
      <div className="hp-wrap">
        <div className="jump-burst" aria-hidden="true">
          <svg className="burst-fan" viewBox="0 0 120 64" fill="none">
            <g className="fan-g breathe">
              <g transform="translate(44 4) scale(.82)">
                <use href="#dropletP" fill="#FFCE3E" stroke="#14224A" strokeWidth="4" strokeLinejoin="round" />
              </g>
              <g transform="translate(14 16) rotate(-38 16 20) scale(.6)">
                <use href="#dropletP" fill="#4EC3F5" stroke="#14224A" strokeWidth="4.5" strokeLinejoin="round" />
              </g>
              <g transform="translate(80 18) rotate(38 16 20) scale(.6)">
                <use href="#dropletP" fill="#FF77B0" stroke="#14224A" strokeWidth="4.5" strokeLinejoin="round" />
              </g>
              <circle cx="10" cy="54" r="4.5" fill="#63C666" stroke="#14224A" strokeWidth="2.5" />
              <circle cx="110" cy="52" r="4" fill="#F5B63C" stroke="#14224A" strokeWidth="2.5" />
            </g>
          </svg>
        </div>
        <h2>Ready to Jump In?</h2>
        <p>
          Your friends, your routines, your moments—bring your people into one place and make every outing feel like
          part of something bigger.
        </p>
        <div className="cta-row">
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
      <span className="drift" data-speed="-0.08" style={{ right: "9%", top: "66%" }} aria-hidden="true">
        <span className="bob2" style={{ animationDelay: "-2.4s" }}>
          <svg width="30" viewBox="0 0 40 40" style={{ transform: "rotate(10deg)" }}>
            <use href="#coin" />
          </svg>
        </span>
      </span>
      <span className="drift" data-speed="-0.06" style={{ left: "8%", top: "24%" }} aria-hidden="true">
        <span className="bob2">
          <svg width="42" viewBox="0 0 56 32" style={{ transform: "rotate(-7deg)" }}>
            <use href="#bill" />
          </svg>
        </span>
      </span>
    </section>
  )
}
