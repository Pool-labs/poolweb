import Image from "next/image"
import Link from "next/link"
import { ClipboardList, Sparkles } from "lucide-react"
import FeaturesCarousel from "@/components/features-carousel"
import HowItWorksCarousel from "@/components/how-it-works-carousel"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center relative">
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="mb-8">
            <Image src="/images/pool-logo-new.png" alt="POOL Logo" width={200} height={200} className="mx-auto" />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold text-pool-navy mb-6">
            Pool. Tap. Done.
          </h1>

          <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-pool-navy mb-8 tracking-wide">A social network for people who spend time — and money — together.</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/preregister"
              className="bg-gradient-to-r from-pool-pink via-pool-purple to-pool-blue hover:from-pool-blue hover:to-pool-pink text-white font-bold py-3 px-6 sm:py-4 sm:px-8 rounded-full text-lg sm:text-xl transform hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <Sparkles size={24} />
              Pre-register for Beta
            </Link>
            <Link
              href="/questionnaire"
              className="bg-gradient-to-r from-pool-green to-pool-blue hover:from-pool-blue hover:to-pool-green text-white font-bold py-3 px-6 sm:py-4 sm:px-8 rounded-full text-lg sm:text-xl transform hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <ClipboardList size={24} />
              Questionnaire
            </Link>
          </div>
        </div>
      </section>

      {/* Beta Notice + Follow the Journey */}
      <section className="container mx-auto px-4 pb-12">
        <div className="max-w-3xl mx-auto bg-white/20 backdrop-blur-sm rounded-3xl px-6 py-5 border border-white/30 shadow-lg text-center">
          <div className="inline-flex items-center gap-2 bg-pool-pink/90 text-white text-xs sm:text-sm font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3">
            Private Beta
          </div>
          <p className="text-pool-navy text-base sm:text-lg font-semibold mb-2">
            Pool is in private beta right now—pre-register to help us shape it.
          </p>
          <p className="text-pool-navy text-sm sm:text-base mb-4">
            Follow the journey on YouTube and keep up with us on Instagram.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/preregister"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-pool-pink to-pool-purple hover:from-pool-purple hover:to-pool-pink text-white font-bold py-2 px-4 rounded-full transform hover:scale-105 active:scale-95 transition-all shadow-md"
            >
              Pre-register for Beta
            </Link>
            <a
              href="https://www.youtube.com/@Pool_App"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Pool on YouTube"
              className="inline-flex items-center gap-2 bg-white/50 hover:bg-white/70 text-pool-navy font-bold py-2 px-4 rounded-full transform hover:scale-105 active:scale-95 transition-all"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              YouTube
            </a>
            <a
              href="https://instagram.com/_poolapp"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Pool on Instagram"
              className="inline-flex items-center gap-2 bg-white/50 hover:bg-white/70 text-pool-navy font-bold py-2 px-4 rounded-full transform hover:scale-105 active:scale-95 transition-all"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              </svg>
              Instagram
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-8 sm:mb-12 md:mb-16 text-pool-navy flex w-full items-baseline justify-center gap-1 sm:gap-2 tracking-tight">
            <span className="bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">WTF</span>
            <span className="text-pool-navy leading-none">Is Pool?!</span>
          </h2>

          <FeaturesCarousel />
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-pool-navy mb-8 sm:mb-12 md:mb-16">{"How It Works"}</h2>

          <HowItWorksCarousel />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto bg-white/20 backdrop-blur-sm rounded-3xl p-6 sm:p-8 md:p-12 shadow-2xl border border-white/30">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-pool-navy mb-4 sm:mb-6">{"Ready to Jump In?"}</h2>
            <p className="text-xl text-pool-navy mb-8">
              {"Your friends, your routines, your moments—bring your people into one place and make every outing feel like part of something bigger."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/preregister"
                className="bg-gradient-to-r from-pool-pink to-pool-purple hover:from-pool-purple hover:to-pool-pink text-white font-bold py-4 px-8 sm:py-6 sm:px-12 rounded-full text-xl sm:text-2xl transform hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-3"
              >
                <Sparkles size={28} />
                {"Pre-register for Beta"}
              </Link>
              <Link
                href="/questionnaire"
                className="bg-gradient-to-r from-pool-green to-pool-blue hover:from-pool-blue hover:to-pool-green text-white font-bold py-4 px-8 sm:py-6 sm:px-12 rounded-full text-xl sm:text-2xl transform hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-3"
              >
                <ClipboardList size={28} />
                {"Questionnaire"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
