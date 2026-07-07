import HeroPool from "@/components/hero-pool"
import Ticker from "@/components/ticker"
import PoolCards from "@/components/pool-cards"
import FeedDemo from "@/components/feed-demo"
import HowItWorks from "@/components/how-it-works"
import BetaCta from "@/components/beta-cta"
import Reveal from "@/components/reveal"
import ScallopDivider from "@/components/scallop-divider"
import { CloudMark } from "@/components/brand/marks"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HeroPool />
      <Ticker />

      {/* WTF Is Pool?! — three pools, slapped on like stickers */}
      <section className="py-16 sm:py-24" id="wtf">
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-center text-navy">
              <span className="text-sticker text-pool-yellow">WTF</span> Is Pool?!
            </h2>
            <p className="text-lg sm:text-xl text-navy/80 text-center mt-5 mb-12 max-w-2xl mx-auto text-balance">
              Create pools around the things you actually do together—roommates, brunch crew,
              travel group, or your everyday coffee run.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <PoolCards />
          </Reveal>
          <Reveal delay={180}>
            <p className="text-center text-navy/80 text-lg mt-12 max-w-2xl mx-auto text-balance">
              When it&rsquo;s time to pay, Pool handles it. Tap-to-pay for the whole
              crew—no IOUs, no awkward math, no receipts to chase.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Shared Moments — the feed demo on the sky band */}
      <ScallopDivider />
      <section className="bg-sky-tint py-14 sm:py-20 relative overflow-hidden" id="shared-moments">
        <CloudMark className="cloud-drift absolute top-10 left-[6%] h-10 w-auto opacity-80" />
        <CloudMark className="cloud-drift-slow absolute top-24 right-[8%] h-14 w-auto opacity-70" />
        <CloudMark className="cloud-drift absolute bottom-12 left-[12%] h-8 w-auto opacity-60 hidden lg:block" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <Reveal className="order-2 lg:order-1">
              <FeedDemo />
            </Reveal>
            <Reveal className="order-1 lg:order-2 text-center lg:text-left" delay={100}>
              <h2 className="font-display font-extrabold text-4xl sm:text-5xl text-navy">Shared Moments</h2>
              <p className="text-lg sm:text-xl text-navy/80 mt-5 max-w-md mx-auto lg:mx-0">
                Stay connected through shared activity. See what your group is up to and make
                every outing feel like part of something bigger.
              </p>
              <p className="text-lg text-navy/80 mt-4 max-w-md mx-auto lg:mx-0">
                Spending shows up in the pool&rsquo;s feed—react to it, comment on it, relive it.
              </p>
            </Reveal>
          </div>
        </div>
      </section>
      <ScallopDivider flip />

      {/* How It Works */}
      <section className="py-16 sm:py-24" id="how-it-works">
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="font-display font-extrabold text-4xl sm:text-5xl text-center text-navy mb-14">
              How It Works
            </h2>
          </Reveal>
          <HowItWorks />
        </div>
      </section>

      {/* Beta CTA — the velvet rope */}
      <section className="py-16 sm:py-24 pb-24">
        <div className="container mx-auto px-4">
          <BetaCta />
        </div>
      </section>
    </div>
  )
}
