import Link from "next/link"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAppStoreIos, faGooglePlay } from '@fortawesome/free-brands-svg-icons'
import BrandPattern from "@/components/brand/pattern"

/**
 * Download.
 *
 * ⚠️ THE HERO MARK WAS `PoolMark`, the bare stacked-rings SVG — a different,
 * simpler mark from the illustrated logo the header and footer use, which is
 * why it read as unfinished. It now uses the same asset as the rest of the
 * site, so the page carries one brand rather than two.
 *
 * The pre-register card is gone: Pool is launching rather than collecting a
 * waiting list, and `/preregister` is no longer a public entry point. The page
 * has one job now — say where the app will be, honestly, until there are real
 * store links to put here.
 */
export default function DownloadPage() {
  return (
    <div className="min-h-screen py-16 sm:py-20 bg-pool-sky relative overflow-hidden">
      <BrandPattern variant="clouds" opacity={0.35} />
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8 flex justify-center">
            <img
              src="/images/pool-logo-new.png"
              alt="Pool"
              width={112}
              height={112}
              className="h-28 w-28 object-contain"
            />
          </div>

          <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-navy mb-6">
            Get Pool
          </h1>
          <p className="text-lg text-navy/80 mb-10 max-w-lg mx-auto">
            Pool is coming to iPhone and Android. The moment it is live in the stores, the links
            land right here.
          </p>

          <div className="sticker rounded-3xl bg-white p-8 md:-rotate-1">
            <div className="flex justify-center gap-6 mb-5 text-navy">
              <FontAwesomeIcon icon={faAppStoreIos} className="h-12 w-12" />
              <FontAwesomeIcon icon={faGooglePlay} className="h-12 w-12" />
            </div>
            <h2 className="font-display font-bold text-2xl text-navy mb-3">Coming soon</h2>
            <p className="text-navy/80">
              The App Store and Google Play links will appear here at launch.
            </p>
          </div>

          <p className="mt-10 text-navy/80">
            Questions in the meantime?{" "}
            <Link href="/contact" className="font-bold text-navy underline underline-offset-4">
              Get in touch
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
