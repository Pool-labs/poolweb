"use client"

import { useCallback, useEffect, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import Autoplay from "embla-carousel-autoplay"
import { Plus, CreditCard, Smartphone } from "lucide-react"

const steps = [
  {
    icon: Plus,
    iconColor: "text-white",
    title: "Create Your Pool",
    description: "Start a pool around the thing you actually do together—your crew, your routine, your moments."
  },
  {
    icon: CreditCard,
    iconColor: "text-white",
    title: "Bring In Your People",
    description: "Add your friends and share the activity. Everyone gets a virtual card so spending together is seamless."
  },
  {
    icon: Smartphone,
    iconColor: "text-white",
    title: "Tap. Done.",
    description: "Pay in one tap and stay connected to what your group is up to. Every outing, part of something bigger."
  }
]

export default function HowItWorksCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      align: 'center',
      containScroll: 'trimSnaps',
      dragFree: false,
      loop: true
    },
    [Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })]
  )
  const [selectedIndex, setSelectedIndex] = useState(0)

  const onSelect = useCallback((emblaApi: any) => {
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [])

  useEffect(() => {
    if (!emblaApi) return

    onSelect(emblaApi)
    emblaApi.on('reInit', onSelect)
    emblaApi.on('select', onSelect)
  }, [emblaApi, onSelect])

  return (
    <div className="max-w-6xl mx-auto">
      {/* Desktop/Tablet Grid Layout */}
      <div className="hidden md:grid md:grid-cols-3 gap-8">
        {steps.map((step, index) => (
          <div
            key={index}
            className="text-center p-6 sm:p-8 rounded-3xl shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-98 transition-all border border-white/30 bg-white/15 backdrop-blur-2xl h-[320px] flex flex-col justify-center"
          >
            <div className="bg-gradient-to-br from-pool-blue to-pool-purple rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <step.icon size={40} className={step.iconColor} />
            </div>
            <h3 className="text-2xl font-bold text-pool-navy mb-4">{step.title}</h3>
            <p className="text-pool-navy text-lg">{step.description}</p>
          </div>
        ))}
      </div>

      {/* Mobile Carousel Layout */}
      <div className="md:hidden relative">
        <div className="overflow-hidden" ref={emblaRef} style={{ touchAction: 'pan-y pinch-zoom' }}>
          <div className="flex" style={{ backfaceVisibility: 'hidden' }}>
            {steps.map((step, index) => (
              <div key={index} className="flex-[0_0_100%] min-w-0">
                <div className="text-center p-6 rounded-3xl shadow-xl border border-white/30 bg-white/15 backdrop-blur-2xl mx-4 h-[320px] flex flex-col justify-center">
                  <div className="bg-gradient-to-br from-pool-blue to-pool-purple rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                    <step.icon size={40} className={step.iconColor} />
                  </div>
                  <h3 className="text-2xl font-bold text-pool-navy mb-4">{step.title}</h3>
                  <p className="text-pool-navy text-lg">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Small Dots Indicator */}
        <div className="flex justify-center mt-4 gap-1">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`rounded-full border transition-all cursor-pointer ${
                selectedIndex === index
                  ? 'border-pool-navy border-2 p-1'
                  : 'border-pool-navy/30 border p-0.5'
              }`}
              onClick={() => emblaApi?.scrollTo(index)}
              role="button"
              tabIndex={0}
              aria-label={`Go to step ${index + 1}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  emblaApi?.scrollTo(index)
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
