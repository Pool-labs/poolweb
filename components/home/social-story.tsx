// Life is social. Money isn't. — the WITHOUT/WITH POOL contrast diagrams.
const displayFont = { fontFamily: "var(--font-display), 'Baloo 2', sans-serif" }

function AvatarCircle({ cx, cy, fill, label }: { cx: number; cy: number; fill: string; label: string }) {
  return (
    <>
      <circle cx={cx} cy={cy} r="22" fill={fill} stroke="#14224A" strokeWidth="3" />
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize="15" fontWeight="800" fill="#14224A" style={displayFont}>
        {label}
      </text>
    </>
  )
}

function DollarDot({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r="10" fill="#F5B63C" stroke="#14224A" strokeWidth="2" />
      <text x={cx} y={cy + 4.5} textAnchor="middle" fontSize="11" fontWeight="800" fill="#14224A" style={displayFont}>
        $
      </text>
    </>
  )
}

export default function SocialStory() {
  return (
    <section className="social-sec">
      <div className="hp-wrap">
        <h2>Life is social. Money isn&rsquo;t.</h2>
        <p className="lede">
          Dinners, trips, rent, game night — everything you do is a group thing. But paying is still a solo sport: one
          person covers it, and the group part is over.
        </p>
        <div className="contrast">
          <div className="contrast-col">
            <h3 className="badge badge-solo">WITHOUT POOL</h3>
            <svg
              className="diagram"
              viewBox="0 0 320 220"
              fill="none"
              role="img"
              aria-label="Four friends sending money back and forth to each other, one by one"
            >
              <line x1="88" y1="50" x2="232" y2="50" stroke="#14224A" strokeWidth="2.5" strokeDasharray="5 7" strokeLinecap="round" opacity=".5" />
              <line x1="60" y1="78" x2="60" y2="142" stroke="#14224A" strokeWidth="2.5" strokeDasharray="5 7" strokeLinecap="round" opacity=".5" />
              <line x1="260" y1="78" x2="260" y2="142" stroke="#14224A" strokeWidth="2.5" strokeDasharray="5 7" strokeLinecap="round" opacity=".5" />
              <line x1="78" y1="68" x2="242" y2="152" stroke="#14224A" strokeWidth="2.5" strokeDasharray="5 7" strokeLinecap="round" opacity=".5" />
              <line x1="242" y1="68" x2="78" y2="152" stroke="#14224A" strokeWidth="2.5" strokeDasharray="5 7" strokeLinecap="round" opacity=".5" />
              <line x1="88" y1="170" x2="232" y2="170" stroke="#14224A" strokeWidth="2.5" strokeDasharray="5 7" strokeLinecap="round" opacity=".5" />
              <AvatarCircle cx={60} cy={50} fill="#4EC3F5" label="A" />
              <AvatarCircle cx={260} cy={50} fill="#FFCE3E" label="J" />
              <AvatarCircle cx={60} cy={170} fill="#FF77B0" label="M" />
              <AvatarCircle cx={260} cy={170} fill="#63C666" label="S" />
              <DollarDot cx={160} cy={50} />
              <DollarDot cx={60} cy={110} />
              <DollarDot cx={260} cy={110} />
              <g className="bell-shake" transform="translate(148 96)">
                <path
                  d="M12 1a9.5 9.5 0 0 1 9.5 9.5c0 5.5 2.5 7.5 3.5 9.5H-1c1-2 3.5-4 3.5-9.5A9.5 9.5 0 0 1 12 1z"
                  fill="#FFCE3E"
                  stroke="#14224A"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="24" r="3" fill="#14224A" />
              </g>
            </svg>
            <p className="caption">
              One person pays, then everyone does their own math, their own reminders, their own payments. One by one,
              every single time.
            </p>
          </div>
          <div className="contrast-col">
            <h3 className="badge badge-pool">WITH POOL</h3>
            <svg
              className="diagram"
              viewBox="0 0 320 220"
              fill="none"
              role="img"
              aria-label="Four friends each putting money into one shared pool"
            >
              <defs>
                <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M0 0 L10 5 L0 10 z" fill="#14224A" />
                </marker>
              </defs>
              <line x1="84" y1="66" x2="118" y2="92" stroke="#14224A" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#arr)" />
              <line x1="236" y1="66" x2="202" y2="92" stroke="#14224A" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#arr)" />
              <line x1="84" y1="156" x2="118" y2="132" stroke="#14224A" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#arr)" />
              <line x1="236" y1="156" x2="202" y2="132" stroke="#14224A" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#arr)" />
              <AvatarCircle cx={60} cy={50} fill="#4EC3F5" label="A" />
              <AvatarCircle cx={260} cy={50} fill="#FFCE3E" label="J" />
              <AvatarCircle cx={60} cy={170} fill="#FF77B0" label="M" />
              <AvatarCircle cx={260} cy={170} fill="#63C666" label="S" />
              <g className="bob2">
                <g transform="translate(146 52) rotate(8 14 14) scale(.7)">
                  <use href="#coin" />
                </g>
              </g>
              <ellipse cx="160" cy="140" rx="46" ry="14" fill="#FF77B0" stroke="#14224A" strokeWidth="3" />
              <ellipse cx="160" cy="126" rx="43" ry="13.5" fill="#FFCE3E" stroke="#14224A" strokeWidth="3" />
              <ellipse cx="160" cy="112" rx="40" ry="13" fill="#4EC3F5" stroke="#14224A" strokeWidth="3" />
              <ellipse cx="160" cy="110.5" rx="29" ry="7.5" fill="#B7E6FB" stroke="#14224A" strokeWidth="2.5" />
            </svg>
            <p className="caption">The crew pools once. The money lives where the group already lives — social from day one.</p>
          </div>
        </div>
        <p className="bridge">Pool fixes group payments by building them social-first.</p>
      </div>
    </section>
  )
}
