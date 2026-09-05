"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"

/**
 * ⚠️ `/preregister` and `/questionnaire` are deliberately ABSENT.
 *
 * Both pages still exist and still work — the pre-register API and its
 * Firestore data are untouched, and the admin Waitlist tab still reads them.
 * What changed is that neither is a PUBLIC entry point any more: Pool is
 * launching rather than collecting a waiting list, so the site should send
 * people to the app, and the questionnaire is a research link to be shared
 * deliberately rather than a headline destination.
 *
 * Removing a nav item does not remove a route. Anyone holding either URL still
 * lands on a working page.
 */
const navLinks = [
  { href: "/", label: "Home" },
  { href: "/download", label: "Download" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
]

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const closeMenu = () => setIsMenuOpen(false)

  return (
    <header className="hp-nav">
      <Link className="hp-nav-brand" href="/" aria-label="Pool — home" onClick={closeMenu}>
        <img src="/images/pool-logo-new.png" alt="" width={40} height={40} />
        <span className="hp-bubble" aria-hidden="true">
          <span className="lt-b">P</span>
          <span className="lt-y">O</span>
          <span className="lt-p">O</span>
          <span className="lt-g">L</span>
        </span>
      </Link>

      <ul className="hp-nav-links">
        {navLinks.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>

      <button
        className="hp-nav-burger"
        type="button"
        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((v) => !v)}
      >
        {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
      </button>

      <ul className={`hp-nav-menu${isMenuOpen ? " open" : ""}`}>
        {navLinks.map((link) => (
          <li key={link.href}>
            <Link href={link.href} onClick={closeMenu}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </header>
  )
}
