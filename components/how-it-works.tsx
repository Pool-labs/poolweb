import Reveal from "@/components/reveal"
import { Coin, Droplet, PoolMark } from "@/components/brand/marks"

/**
 * How It Works — the three existing steps, connected by a dotted droplet
 * path. Copy kept from the original site (one banned word fixed: "seamless").
 */

const steps = [
  {
    n: "1",
    color: "bg-pool-blue",
    title: "Create Your Pool",
    description:
      "Start a pool around the thing you actually do together—your crew, your routine, your moments.",
    art: <PoolMark className="h-16 w-auto" />,
  },
  {
    n: "2",
    color: "bg-pool-yellow",
    title: "Bring In Your People",
    description:
      "Add your friends and share the activity. Everyone gets a card that spends straight from the pool.",
    art: (
      <span className="flex items-end" aria-hidden="true">
        {[
          ["M", "bg-pool-pink"],
          ["J", "bg-pool-blue"],
          ["S", "bg-pool-yellow"],
        ].map(([initial, color], i) => (
          <span
            key={initial}
            className={`w-12 h-12 rounded-full border-[2.5px] border-navy flex items-center justify-center text-lg font-bold text-navy ${color} ${i > 0 ? "-ml-3" : ""}`}
          >
            {initial}
          </span>
        ))}
      </span>
    ),
  },
  {
    n: "3",
    color: "bg-pool-pink",
    title: "Tap. Done.",
    description:
      "Pay in one tap and stay connected to what your group is up to. Every outing, part of something bigger.",
    art: (
      <span className="relative inline-flex" aria-hidden="true">
        <Coin className="h-14 w-14" />
        <svg viewBox="0 0 24 24" className="absolute -right-4 top-1 h-6 w-6" aria-hidden="true">
          <path d="M4 12a8 8 0 0 1 8-8" fill="none" stroke="#14224A" strokeWidth="2.5" strokeLinecap="round" transform="rotate(45 12 12)" />
          <path d="M1 12A11 11 0 0 1 12 1" fill="none" stroke="#14224A" strokeWidth="2.5" strokeLinecap="round" transform="rotate(45 12 12)" />
        </svg>
      </span>
    ),
  },
]

export default function HowItWorks() {
  return (
    <div className="relative max-w-5xl mx-auto">
      {/* Dotted droplet path connecting the steps (desktop) */}
      <svg
        className="hidden md:block absolute top-24 left-0 w-full h-16 z-0"
        viewBox="0 0 1000 60"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M170 30 C 320 -10, 420 70, 500 30 S 700 -10, 830 30"
          fill="none"
          stroke="#14224A"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="0.5 16"
          opacity="0.55"
        />
      </svg>
      <div className="hidden md:block absolute top-[86px] left-[46%] z-0" aria-hidden="true">
        <Droplet color="blue" className="h-6 w-auto -rotate-12" />
      </div>
      <div className="hidden md:block absolute top-[70px] left-[63%] z-0" aria-hidden="true">
        <Droplet color="pink" className="h-5 w-auto rotate-12" />
      </div>

      <div className="grid gap-10 md:gap-6 md:grid-cols-3 relative z-10">
        {steps.map((step, i) => (
          <Reveal key={step.n} delay={i * 130}>
            <div className="text-center flex flex-col items-center px-2">
              <div className="sticker rounded-full w-24 h-24 flex items-center justify-center bg-white mb-5">
                {step.art}
              </div>
              <span
                className={`inline-flex items-center justify-center w-8 h-8 rounded-full border-[2.5px] border-navy font-display font-bold text-navy mb-3 ${step.color}`}
                aria-hidden="true"
              >
                {step.n}
              </span>
              <h3 className="font-display font-bold text-2xl text-navy mb-2">{step.title}</h3>
              <p className="text-navy/80 leading-relaxed max-w-xs">{step.description}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
