"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/download", label: "Download" },
  { href: "/preregister", label: "Pre-Register" },
  { href: "/questionnaire", label: "Questionnaire" },
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
