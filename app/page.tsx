import Link from "next/link"
import { ClipboardList, Sparkles } from "lucide-react"
import FeaturesCarousel from "@/components/features-carousel"
import HowItWorksCarousel from "@/components/how-it-works-carousel"
import HeroPool from "@/components/hero-pool"
import Ticker from "@/components/ticker"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HeroPool />
      <Ticker />

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
