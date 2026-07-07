import type { SVGProps } from "react"

/**
 * Pool brand marks, rebuilt as inline SVG from the brand assets:
 * thick navy outlines, flat fills, no gradients. These are the
 * illustration vocabulary for the whole site — never scale the PNG logo.
 */

const NAVY = "#14224A"
const BLUE = "#4EC3F5"
const YELLOW = "#FFCE3E"
const PINK = "#FF77B0"
const GREEN = "#63C666"
const GOLD = "#F5B63C"
const CLOUD = "#FDFCF9"

type MarkProps = SVGProps<SVGSVGElement>

/** Three-ring kiddie pool (blue / yellow / pink) with water. */
export function PoolMark(props: MarkProps) {
  return (
    <svg viewBox="0 0 120 96" fill="none" aria-hidden="true" focusable="false" {...props}>
      <ellipse cx="60" cy="72" rx="54" ry="18" fill={PINK} stroke={NAVY} strokeWidth="5" />
      <ellipse cx="60" cy="56" rx="51" ry="17" fill={YELLOW} stroke={NAVY} strokeWidth="5" />
      <ellipse cx="60" cy="40" rx="48" ry="16" fill={BLUE} stroke={NAVY} strokeWidth="5" />
      <ellipse cx="60" cy="38.5" rx="36" ry="9.5" fill="#B7E6FB" stroke={NAVY} strokeWidth="3.5" />
    </svg>
  )
}

/** Gold coin with a $ face. */
export function Coin(props: MarkProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false" {...props}>
      <circle cx="20" cy="20" r="16.5" fill={GOLD} stroke={NAVY} strokeWidth="3" />
      <circle cx="20" cy="20" r="11" fill="#FFD66B" stroke={NAVY} strokeWidth="2" />
      <text
        x="20"
        y="26"
        textAnchor="middle"
        fontSize="16"
        fontWeight="800"
        fontFamily="var(--font-display), system-ui, sans-serif"
        fill={NAVY}
      >
        $
      </text>
    </svg>
  )
}

/** Flat green dollar bill. */
export function Bill(props: MarkProps) {
  return (
    <svg viewBox="0 0 56 32" fill="none" aria-hidden="true" focusable="false" {...props}>
      <rect x="2" y="2" width="52" height="28" rx="5" fill={GREEN} stroke={NAVY} strokeWidth="3" />
      <rect x="7.5" y="7" width="41" height="18" rx="2.5" stroke={NAVY} strokeWidth="1.8" />
      <circle cx="28" cy="16" r="7.5" fill="#8FDC92" stroke={NAVY} strokeWidth="2" />
      <text
        x="28"
        y="20.5"
        textAnchor="middle"
        fontSize="11"
        fontWeight="800"
        fontFamily="var(--font-display), system-ui, sans-serif"
        fill={NAVY}
      >
        $
      </text>
    </svg>
  )
}

const dropletFills = { blue: BLUE, yellow: YELLOW, pink: PINK, green: GREEN } as const

/** Water droplet — blue / yellow / pink / green variants. */
export function Droplet({
  color = "blue",
  ...props
}: MarkProps & { color?: keyof typeof dropletFills }) {
  return (
    <svg viewBox="0 0 32 40" fill="none" aria-hidden="true" focusable="false" {...props}>
      <path
        d="M16 3C16 3 5 17 5 26a11 11 0 0 0 22 0C27 17 16 3 16 3Z"
        fill={dropletFills[color]}
        stroke={NAVY}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** The Y-shaped splash burst. */
export function Splash({
  color = "yellow",
  ...props
}: MarkProps & { color?: "yellow" | "pink" | "blue" }) {
  const fill = color === "yellow" ? YELLOW : color === "pink" ? PINK : BLUE
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false" {...props}>
      <path
        d="M20 46C18.5 38 18.5 31 20.5 25C13 21 6.5 12.5 5 3.5C11 9.5 18 14.5 23 16.5C23.6 16.7 24.4 16.7 25 16.5C30 14.5 37 9.5 43 3.5C41.5 12.5 35 21 27.5 25C29.5 31 29.5 38 28 46C25.5 41 22.5 41 20 46Z"
        fill={fill}
        stroke={NAVY}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Flat outlined cloud. */
export function CloudMark(props: MarkProps) {
  return (
    <svg viewBox="0 0 72 44" fill="none" aria-hidden="true" focusable="false" {...props}>
      <path
        d="M18 38a12 12 0 0 1-3-23.6A14.5 14.5 0 0 1 43 9a11 11 0 0 1 14.5 10.5A9.5 9.5 0 0 1 54 38H18Z"
        fill="#FFFFFF"
        stroke={NAVY}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Bubble-letter wordmark: P blue, O yellow, O pink, L green,
 * navy outline via paint-order (see .svg-sticker-text).
 */
export function Wordmark({
  outline = "navy",
  ...props
}: MarkProps & { outline?: "navy" | "cloud" }) {
  return (
    <svg
      viewBox="0 0 104 40"
      aria-hidden="true"
      focusable="false"
      style={{ overflow: "visible" }}
      {...props}
    >
      <text
        x="1"
        y="31"
        className="svg-sticker-text"
        fontSize="32"
        letterSpacing="0.5"
        strokeWidth="5"
        style={{ stroke: outline === "cloud" ? CLOUD : NAVY }}
      >
        <tspan fill={BLUE}>P</tspan>
        <tspan fill={YELLOW}>O</tspan>
        <tspan fill={PINK}>O</tspan>
        <tspan fill={GREEN}>L</tspan>
      </text>
    </svg>
  )
}
