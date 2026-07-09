// Reusable brand shapes referenced across the homepage via <use href="#...">.
const displayFont = { fontFamily: "var(--font-display), 'Baloo 2', sans-serif" }

export default function BrandDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <g id="coin">
          <circle cx="20" cy="20" r="16.5" fill="#F5B63C" stroke="#14224A" strokeWidth="3" />
          <circle cx="20" cy="20" r="11" fill="#FFD66B" stroke="#14224A" strokeWidth="2" />
          <text x="20" y="25.5" textAnchor="middle" fontSize="15" fontWeight="800" fill="#14224A" style={displayFont}>
            $
          </text>
        </g>
        <path id="dropletP" d="M16 3C16 3 5 17 5 26a11 11 0 0 0 22 0C27 17 16 3 16 3Z" />
        <g id="bill">
          <rect x="2" y="2" width="52" height="28" rx="5" fill="#63C666" stroke="#14224A" strokeWidth="3" />
          <rect x="7.5" y="7" width="41" height="18" rx="2.5" fill="none" stroke="#14224A" strokeWidth="1.8" />
          <circle cx="28" cy="16" r="7.5" fill="#8FDC92" stroke="#14224A" strokeWidth="2" />
          <text x="28" y="20.5" textAnchor="middle" fontSize="11" fontWeight="800" fill="#14224A" style={displayFont}>
            $
          </text>
        </g>
      </defs>
    </svg>
  )
}
