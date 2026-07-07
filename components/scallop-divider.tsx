/**
 * Flat scalloped water edge, in brand style: flat fill + navy outline along
 * the scallop curve only. `flip` points the scallops downward.
 */
export default function ScallopDivider({
  color = "#EAF7FE",
  bg,
  flip = false,
  className = "",
}: {
  color?: string
  /** Fill behind the scallops — the adjacent section's color (avoids slivers between bands). */
  bg?: string
  flip?: boolean
  className?: string
}) {
  return (
    <div className={`leading-[0] ${className}`} style={bg ? { backgroundColor: bg } : undefined} aria-hidden="true">
      <svg
        viewBox="0 0 1200 22"
        preserveAspectRatio="none"
        className={`block w-full h-4 sm:h-5 ${flip ? "-scale-y-100" : ""}`}
      >
        <path
          d={`M0 22 L0 14 ${Array.from({ length: 20 }, (_, i) => `A 60 60 0 0 1 ${(i + 1) * 60} 14`).join(" ")} L1200 22 Z`}
          fill={color}
        />
        <path
          d={`M0 14 ${Array.from({ length: 20 }, (_, i) => `A 60 60 0 0 1 ${(i + 1) * 60} 14`).join(" ")}`}
          fill="none"
          stroke="#14224A"
          strokeWidth="2.5"
        />
      </svg>
    </div>
  )
}
