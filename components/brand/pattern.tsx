import { cn } from "@/lib/utils"

/**
 * Scattered brand-mark background patterns (coins/bills, droplets, clouds) —
 * straight from the asset sheet's pattern swatches: flat fills, navy outlines,
 * tiled with an SVG <pattern> so it costs one paint. Always decorative.
 */

const NAVY = "#14224A"

const tiles: Record<"money" | "droplets" | "clouds", { size: number; content: React.ReactNode }> = {
  money: {
    size: 230,
    content: (
      <>
        <g transform="translate(26 34) scale(0.72)">
          <circle cx="20" cy="20" r="16.5" fill="#F5B63C" stroke={NAVY} strokeWidth="3" />
          <circle cx="20" cy="20" r="11" fill="#FFD66B" stroke={NAVY} strokeWidth="2" />
        </g>
        <g transform="translate(126 24) rotate(-14)">
          <rect width="52" height="28" rx="5" fill="#63C666" stroke={NAVY} strokeWidth="3" />
          <circle cx="26" cy="14" r="7" fill="#8FDC92" stroke={NAVY} strokeWidth="2" />
        </g>
        <g transform="translate(150 156) scale(0.5)">
          <circle cx="20" cy="20" r="16.5" fill="#F5B63C" stroke={NAVY} strokeWidth="3.5" />
          <circle cx="20" cy="20" r="11" fill="#FFD66B" stroke={NAVY} strokeWidth="2.5" />
        </g>
        <g transform="translate(38 150) rotate(11) scale(0.8)">
          <rect width="52" height="28" rx="5" fill="#63C666" stroke={NAVY} strokeWidth="3" />
          <circle cx="26" cy="14" r="7" fill="#8FDC92" stroke={NAVY} strokeWidth="2" />
        </g>
      </>
    ),
  },
  droplets: {
    size: 210,
    content: (
      <>
        <g transform="translate(30 28) scale(0.8)">
          <path d="M16 3C16 3 5 17 5 26a11 11 0 0 0 22 0C27 17 16 3 16 3Z" fill="#4EC3F5" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
        </g>
        <g transform="translate(140 84) scale(0.62) rotate(9)">
          <path d="M16 3C16 3 5 17 5 26a11 11 0 0 0 22 0C27 17 16 3 16 3Z" fill="#FF77B0" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
        </g>
        <g transform="translate(66 152) scale(0.72) rotate(-8)">
          <path d="M16 3C16 3 5 17 5 26a11 11 0 0 0 22 0C27 17 16 3 16 3Z" fill="#FFCE3E" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
        </g>
        <g transform="translate(178 178) scale(0.45)">
          <path d="M16 3C16 3 5 17 5 26a11 11 0 0 0 22 0C27 17 16 3 16 3Z" fill="#4EC3F5" stroke={NAVY} strokeWidth="3.5" strokeLinejoin="round" />
        </g>
      </>
    ),
  },
  clouds: {
    size: 260,
    content: (
      <>
        <g transform="translate(22 36) scale(0.85)">
          <path d="M18 38a12 12 0 0 1-3-23.6A14.5 14.5 0 0 1 43 9a11 11 0 0 1 14.5 10.5A9.5 9.5 0 0 1 54 38H18Z" fill="#FFFFFF" stroke={NAVY} strokeWidth="3.5" strokeLinejoin="round" />
        </g>
        <g transform="translate(150 150) scale(0.6)">
          <path d="M18 38a12 12 0 0 1-3-23.6A14.5 14.5 0 0 1 43 9a11 11 0 0 1 14.5 10.5A9.5 9.5 0 0 1 54 38H18Z" fill="#FFFFFF" stroke={NAVY} strokeWidth="4" strokeLinejoin="round" />
        </g>
        <g transform="translate(196 44) scale(0.5)">
          <path d="M16 3C16 3 5 17 5 26a11 11 0 0 0 22 0C27 17 16 3 16 3Z" fill="#4EC3F5" stroke={NAVY} strokeWidth="3.5" strokeLinejoin="round" />
        </g>
      </>
    ),
  },
}

export default function BrandPattern({
  variant = "money",
  opacity = 0.5,
  className,
}: {
  variant?: keyof typeof tiles
  opacity?: number
  className?: string
}) {
  const tile = tiles[variant]
  const id = `pool-pat-${variant}`
  return (
    <svg
      className={cn("absolute inset-0 w-full h-full pointer-events-none", className)}
      aria-hidden="true"
      style={{ opacity }}
    >
      <defs>
        <pattern id={id} width={tile.size} height={tile.size} patternUnits="userSpaceOnUse" patternTransform="rotate(-3)">
          {tile.content}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}
