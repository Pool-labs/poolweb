// How It Works — three numbered coins along a dotted splash path.
const displayFont = { fontFamily: "var(--font-display), 'Baloo 2', sans-serif" }

function StepCoin({ n }: { n: number }) {
  return (
    <span className="coin-pop">
      <svg className="step-coin" viewBox="0 0 40 40" role="img" aria-label={`Step ${n}`}>
        <circle cx="20" cy="20" r="16.5" fill="#F5B63C" stroke="#14224A" strokeWidth="3" />
        <circle cx="20" cy="20" r="11" fill="#FFD66B" stroke="#14224A" strokeWidth="2" />
        <text x="20" y="25.5" textAnchor="middle" fontSize="15" fontWeight="800" fill="#14224A" style={displayFont}>
          {n}
        </text>
      </svg>
    </span>
  )
}

export default function HowSteps() {
  return (
    <section className="how" id="how-it-works">
      <div className="hp-wrap">
        <h2>How It Works</h2>
        <div className="steps">
          <svg className="steps-path" viewBox="0 0 1000 84" preserveAspectRatio="none" fill="none" aria-hidden="true">
            <path
              d="M120 42 C 260 -14, 380 78, 500 34 S 760 -18, 880 42"
              stroke="#14224A"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="0.5 15"
            />
          </svg>
          <div className="step">
            <StepCoin n={1} />
            <h3>Create Your Pool</h3>
            <p>Start a pool around the thing you actually do together—your crew, your routine, your moments.</p>
          </div>
          <div className="step">
            <StepCoin n={2} />
            <h3>Bring In Your People</h3>
            <p>Add your friends and share the activity. Everyone gets a virtual card, so paying together is one tap.</p>
          </div>
          <div className="step">
            <StepCoin n={3} />
            <h3>Pool. Tap. Done.</h3>
            <p>Pay in one tap and stay connected to what your group is up to. Every outing, part of something bigger.</p>
          </div>
        </div>
      </div>
      <span className="drift" data-speed="-0.11" style={{ left: "6%", top: "72%" }} aria-hidden="true">
        <span className="bob2">
          <svg width="30" viewBox="0 0 40 40" style={{ transform: "rotate(-9deg)" }}>
            <use href="#coin" />
          </svg>
        </span>
      </span>
      <span className="drift" data-speed="-0.05" style={{ right: "7%", top: "28%" }} aria-hidden="true">
        <span className="bob2" style={{ animationDelay: "-1.8s" }}>
          <svg width="18" viewBox="0 0 32 40">
            <use href="#dropletP" fill="#FF77B0" stroke="#14224A" strokeWidth="3" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
    </section>
  )
}
