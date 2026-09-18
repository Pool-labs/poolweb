import Link from "next/link"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAppStoreIos, faGooglePlay } from '@fortawesome/free-brands-svg-icons'
import BrandPattern from "@/components/brand/pattern"
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/store-links"

/**
 * Download.
 *
 * ⚠️ THE HERO MARK WAS `PoolMark`, the bare stacked-rings SVG — a different,
 * simpler mark from the illustrated logo the header and footer use, which is
 * why it read as unfinished. It now uses the same asset as the rest of the
 * site, so the page carries one brand rather than two.
 *
 * The pre-register card is gone: Pool is launching rather than collecting a
 * waiting list, and `/preregister` is no longer a public entry point.
 *
 * ⚠️ POOL IS LIVE ON THE APP STORE (2026-09-18) AND NOT YET ON GOOGLE PLAY, and
 * this page shows that asymmetry rather than hiding it. Two matching store
 * buttons would send every Android visitor to a dead end — worse than telling
 * them plainly that it is coming, because a broken link reads as a broken
 * company. The iOS button is a real, prominent call to action; the Android card
 * is a quiet, honest note beside it.
 *
 * Both URLs come from `lib/store-links.ts`. When Play goes live, set
 * `PLAY_STORE_URL` there — the copy for both states is already written here.
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
            Pool is live on the App Store. Android is on its way.
          </p>

          <div className="sticker rounded-3xl bg-white p-8 md:-rotate-1">
            <div className="flex justify-center mb-5 text-navy">
              <FontAwesomeIcon icon={faAppStoreIos} className="h-12 w-12" />
            </div>
            <h2 className="font-display font-bold text-2xl text-navy mb-3">
              Download for iPhone
            </h2>
            <p className="text-navy/80 mb-6">Free on the App Store. iPhone and iPad.</p>
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hp-btn hp-btn-pink inline-flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faAppStoreIos} className="h-5 w-5" />
              Get it on the App Store
            </a>
          </div>

          {PLAY_STORE_URL === null ? (
            /* ⚠️ Deliberately NOT a button, and deliberately quieter than the
               card above. A disabled-looking Play button invites a tap that
               cannot go anywhere; a sentence sets the expectation correctly
               and costs the Android visitor nothing. */
            <div className="mt-6 rounded-2xl border-2 border-navy/15 bg-white/60 p-6">
              <div className="flex items-center justify-center gap-3 text-navy/70">
                <FontAwesomeIcon icon={faGooglePlay} className="h-6 w-6" />
                <span className="font-display font-bold text-lg">Android is coming</span>
              </div>
              <p className="mt-2 text-navy/70 text-sm">
                Pool is not on Google Play yet. The link will be right here the day it is.
              </p>
            </div>
          ) : (
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hp-btn hp-btn-green mt-6 inline-flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faGooglePlay} className="h-5 w-5" />
              Get it on Google Play
            </a>
          )}

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
