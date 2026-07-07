"use client"

import Link from "next/link"
import { useRef } from "react"
import { cn } from "@/lib/utils"

/**
 * Pink sticker CTA with a droplet burst on click. Droplets are throwaway
 * spans animated by the .droplet-burst keyframes (transform/opacity only);
 * skipped entirely under prefers-reduced-motion.
 */
export default function BurstButton({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  const wrapRef = useRef<HTMLSpanElement>(null)

  const burst = (e: React.PointerEvent) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const wrap = wrapRef.current
    if (!wrap) return
    const box = wrap.getBoundingClientRect()
    const x = e.clientX - box.left
    const y = e.clientY - box.top
    const colors = ["#4EC3F5", "#FFCE3E", "#FF77B0", "#63C666", "#4EC3F5"]
    for (let i = 0; i < 5; i++) {
      const s = document.createElement("span")
      const angle = -Math.PI / 2 + (i - 2) * 0.55 + (Math.random() - 0.5) * 0.3
      const dist = 26 + Math.random() * 22
      s.className = "droplet-burst"
      s.style.cssText = `position:absolute;left:${x}px;top:${y}px;pointer-events:none;z-index:30;--burst-x:${Math.cos(angle) * dist}px;--burst-y:${Math.sin(angle) * dist}px;`
      s.innerHTML = `<svg viewBox="0 0 32 40" width="10" height="13" aria-hidden="true"><path d="M16 3C16 3 5 17 5 26a11 11 0 0 0 22 0C27 17 16 3 16 3Z" fill="${colors[i % colors.length]}" stroke="#14224A" stroke-width="3" stroke-linejoin="round"/></svg>`
      wrap.appendChild(s)
      setTimeout(() => s.remove(), 550)
    }
  }

  return (
    <span ref={wrapRef} className="relative inline-flex">
      <Link href={href} className={cn("btn-sticker btn-pink", className)} onPointerDown={burst}>
        {children}
      </Link>
    </span>
  )
}
