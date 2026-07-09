// WTF Is Pool?! — the three splat features.
export default function Wtf() {
  return (
    <section className="wtf" id="wtf">
      <div className="hp-wrap">
        <h2>
          <span className="hp-bubble">
            <span className="lt-p">W</span>
            <span className="lt-b">T</span>
            <span className="lt-y">F</span>
          </span>{" "}
          Is Pool?!
        </h2>
        <div className="features">
          <div className="feature">
            <div className="splat-wrap">
              <div className="splat splat-blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <circle cx="9" cy="8" r="3.4" />
                  <path d="M2.8 19c.4-3.4 3-5.5 6.2-5.5s5.8 2.1 6.2 5.5" />
                  <circle cx="17" cy="9" r="2.8" />
                  <path d="M16.5 13.6c2.7.4 4.6 2.3 5 5.4" />
                </svg>
              </div>
              <svg className="splat-drop" style={{ right: -14, bottom: 2, width: 13 }} viewBox="0 0 32 40" aria-hidden="true">
                <use href="#dropletP" fill="#4EC3F5" stroke="#14224A" strokeWidth="3" strokeLinejoin="round" />
              </svg>
              <svg className="splat-drop" style={{ left: -12, top: -8, width: 10 }} viewBox="0 0 32 40" aria-hidden="true">
                <use href="#dropletP" fill="#4EC3F5" stroke="#14224A" strokeWidth="3" strokeLinejoin="round" />
              </svg>
            </div>
            <h3>Your People, Your Pools</h3>
            <p>
              Create pools around the things you actually do together—roommates, brunch crew, travel group, or your
              everyday coffee run.
            </p>
          </div>
          <div className="feature">
            <div className="splat-wrap">
              <div className="splat splat-pink">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6L12 16.7l-5.4 2.9 1.1-6L3.2 9.4l6.1-.8z" />
                </svg>
              </div>
              <svg className="splat-drop" style={{ left: -14, bottom: 8, width: 12 }} viewBox="0 0 32 40" aria-hidden="true">
                <use href="#dropletP" fill="#FF77B0" stroke="#14224A" strokeWidth="3" strokeLinejoin="round" />
              </svg>
            </div>
            <h3>Shared Moments</h3>
            <p>
              Stay connected through shared activity. See what your group is up to and make every outing feel like part
              of something bigger.
            </p>
          </div>
          <div className="feature">
            <div className="splat-wrap">
              <div className="splat splat-yellow">
                <svg viewBox="0 0 24 24" fill="#14224A" aria-hidden="true">
                  <path d="M13 2 4.5 14H10l-1 8 8.5-12H12l1-8z" />
                </svg>
              </div>
              <svg className="splat-drop" style={{ right: -12, top: -6, width: 11 }} viewBox="0 0 32 40" aria-hidden="true">
                <use href="#dropletP" fill="#FFCE3E" stroke="#14224A" strokeWidth="3" strokeLinejoin="round" />
              </svg>
            </div>
            <h3>Pool. Tap. Done.</h3>
            <p>When it's time to pay, Pool handles it. Tap-to-pay for the whole crew—no IOUs, no awkward math, no receipts to chase.</p>
          </div>
        </div>
      </div>
      <span className="drift" data-speed="-0.07" style={{ left: "4%", top: "26%" }} aria-hidden="true">
        <span className="bob2">
          <svg width="48" viewBox="0 0 56 32" style={{ transform: "rotate(-10deg)" }}>
            <use href="#bill" />
          </svg>
        </span>
      </span>
      <span className="drift" data-speed="-0.1" style={{ right: "5%", top: "60%" }} aria-hidden="true">
        <span className="bob2" style={{ animationDelay: "-2s" }}>
          <svg width="34" viewBox="0 0 40 40" style={{ transform: "rotate(12deg)" }}>
            <use href="#coin" />
          </svg>
        </span>
      </span>
    </section>
  )
}
