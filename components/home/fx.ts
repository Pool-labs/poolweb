// Shared bits for the homepage's imperative sparkle (bursts, tosses, drips).
export const NAVY = "#14224A"
export const COLORS = ["#4EC3F5", "#FFCE3E", "#FF77B0", "#63C666", "#F5B63C"]

export const dropletSvg = (color: string, w: number) =>
  `<svg width="${w}" viewBox="0 0 32 40"><path d="M16 3C16 3 5 17 5 26a11 11 0 0 0 22 0C27 17 16 3 16 3Z" fill="${color}" stroke="${NAVY}" stroke-width="3" stroke-linejoin="round"/></svg>`

export const coinSvg = (w: number) =>
  `<svg width="${w}" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16.5" fill="#F5B63C" stroke="${NAVY}" stroke-width="3"/><circle cx="20" cy="20" r="11" fill="#FFD66B" stroke="${NAVY}" stroke-width="2"/><text x="20" y="25.5" text-anchor="middle" font-size="15" font-family="var(--font-display), 'Baloo 2', sans-serif" font-weight="800" fill="${NAVY}">$</text></svg>`

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
