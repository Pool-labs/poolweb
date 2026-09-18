import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

/**
 * Shared shell for the published legal documents (/privacy, /terms).
 *
 * The HTML comes from `lib/legal/*.generated.ts`, generated from the canonical
 * markdown in the poolmobile repo (`docs/legal/`) — see poolmobile #595. Those
 * markdown files are the source of truth; never edit the generated constants
 * or restyle claims here. `.legal-doc` styles live in globals.css (this site
 * has no Tailwind typography plugin, so bare `prose` classes do nothing).
 */
export function LegalDoc({ html }: { html: string }) {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      {/*
        ⚠️ STACKS BELOW `sm`, and the nav WRAPS. On a phone this row put "Back
        to Home" and three long link labels on one line with `justify-between`
        and no wrap strategy — flex shrank the items below their content and the
        labels printed ON TOP of each other ("Back to Ho[me]" under "Privacy
        Policy"). These are the documents an app-store reviewer opens on a
        handset, so the phone layout is the one that matters most.
      */}
      <div className="mb-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/">
          <Button variant="ghost" className="gap-2 px-0 sm:px-4">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
        </Link>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>
          <Link href="/terms" className="underline underline-offset-4">
            Terms of Service
          </Link>
          {/* Google Play's Child Safety Standards policy requires these
              standards to be EXTERNALLY PUBLISHED, so the page has to be
              reachable from the site rather than only via the URL handed to
              Play. Do not remove. */}
          <Link href="/child-safety" className="underline underline-offset-4">
            Child Safety
          </Link>
        </nav>
      </div>

      <article className="legal-doc" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
