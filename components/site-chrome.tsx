"use client"

import { usePathname } from "next/navigation"

import Footer from "@/components/footer"
import Header from "@/components/header"

/**
 * The marketing site's header and footer — and the decision about where they
 * belong.
 *
 * ⚠️ THEY WERE RENDERED UNCONDITIONALLY FROM THE ROOT LAYOUT, so the admin
 * dashboard carried the public nav: the login screen showed "Home / Download /
 * Pre-Register / Questionnaire / FAQ / Contact" stacked above its own
 * environment strip. `/admin` has its own chrome (`app/admin/layout.tsx`) and
 * an audience that is not a visitor.
 *
 * Prefix match, not equality, so every nested admin route is covered — a new
 * one inherits this rather than having to remember it.
 */
const CHROME_FREE_PREFIXES = ["/admin"]

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/"
  const bare = CHROME_FREE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

  if (bare) return <>{children}</>

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  )
}
