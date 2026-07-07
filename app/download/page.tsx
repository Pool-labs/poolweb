import Link from "next/link"
import { Bell } from "lucide-react"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAppStoreIos, faGooglePlay } from '@fortawesome/free-brands-svg-icons'
import { PoolMark } from "@/components/brand/marks"

export default function DownloadPage() {
  return (
    <div className="min-h-screen py-16 sm:py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8 flex justify-center">
            <PoolMark className="h-28 w-auto" />
          </div>

          <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-navy mb-10">{"Download POOL!"}</h1>

          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto mb-12">
            {/* Pre-Register Section */}
            <div className="sticker sticker-interactive rounded-3xl bg-white p-8 md:-rotate-1 flex flex-col">
              <div className="flex items-center justify-center mb-4">
                <span className="inline-flex items-center justify-center w-14 h-14 rounded-full border-2 border-navy bg-pool-yellow">
                  <Bell className="w-7 h-7 text-navy" />
                </span>
              </div>
              <h2 className="font-display font-bold text-2xl text-navy mb-4">Get Notified When We Launch!</h2>
              <p className="text-navy/80 mb-6 flex-1">
                Be the first to know when POOL is available for download. Join our pre-registeration list for exclusive early access.
              </p>
              <Link href="/preregister" className="btn-sticker btn-pink w-full text-lg">
                Pre-Register Now
              </Link>
            </div>

            <div className="sticker rounded-3xl bg-sky-tint p-8 md:rotate-1 flex flex-col justify-center">
              <div className="flex justify-center gap-4 mb-4 text-navy">
                <FontAwesomeIcon icon={faAppStoreIos} className="h-12" />
                <FontAwesomeIcon icon={faGooglePlay} className="h-12" />
              </div>
              <h3 className="font-display font-bold text-2xl text-navy mb-4">Coming Soon!</h3>
              <p className="text-lg text-navy/80">Our app will be available on both the iOS App Store and Google Play Store soon. Stay tuned!</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
