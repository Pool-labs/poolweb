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
      <div className="mb-8 flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
        </Link>
        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>
          <Link href="/terms" className="underline underline-offset-4">
            Terms of Service
          </Link>
        </nav>
      </div>

      <article className="legal-doc" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
