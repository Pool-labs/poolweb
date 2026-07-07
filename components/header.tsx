"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { PoolMark, Wordmark } from "@/components/brand/marks"

const navLinks = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/questionnaire", label: "Questionnaire" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
]

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const closeMenu = () => setIsMenuOpen(false)

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [isMenuOpen])

  return (
    <header className="sticky top-0 z-50 bg-cloud border-b-2 border-navy">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-2" aria-label="Pool — home" onClick={closeMenu}>
            <PoolMark className="h-9 w-auto" />
            <Wordmark className="h-8 w-auto" />
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-bold text-navy hover:text-pool-blue transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/preregister" className="btn-sticker btn-pink px-5 py-2 text-sm">
              Pre-register
            </Link>
          </nav>

          <button
            className="md:hidden text-navy w-11 h-11 flex items-center justify-center rounded-xl border-2 border-navy bg-white shadow-[3px_3px_0_#14224A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile full-screen sheet */}
      {isMenuOpen && (
        <nav className="md:hidden fixed inset-x-0 top-[64px] bottom-0 z-40 bg-cloud overflow-y-auto">
          <div className="container mx-auto px-4 py-8 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="sticker sticker-interactive px-5 py-4 text-lg font-bold text-navy"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/preregister"
              onClick={closeMenu}
              className="btn-sticker btn-pink px-5 py-4 text-lg mt-2"
            >
              Pre-register for the beta
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}
