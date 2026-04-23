"use client"

import { useCallback, useEffect, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import Autoplay from "embla-carousel-autoplay"
import { Zap, Users, Star } from "lucide-react"

const features = [
  {
    icon: Users,
    iconColor: "text-pool-blue",
    title: "Your People, Your Pools",
    description: "Create pools around the things you actually do together—roommates, brunch crew, travel group, or your everyday coffee run."
  },
  {
    icon: Star,
    iconColor: "text-pool-pink",
    title: "Shared Moments",
    description: "Stay connected through shared activity. See what your group is up to and make every outing feel like part of something bigger."
  },
  {
    icon: Zap,
    iconColor: "text-pool-yellow",
    title: "Tap. Done.",
    description: "When it's time to pay, Pool handles it. Tap-to-pay for the whole crew—no IOUs, no awkward math, no receipts to chase."
  }
]

export default function FeaturesCarousel() {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      align: 'center',
      containScroll: 'trimSnaps',
      dragFree: false,
      loop: true,
      skipSnaps: false,
      // Reduce rerender on mobile
      watchDrag: isMobile,
    },
    [Autoplay({ 
      delay: isMobile ? 5000 : 4000, // Slower on mobile to save battery
      stopOnInteraction: false, 
      stopOnMouseEnter: true 
    })]
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
        {features.map((feature, index) => (
          <div
            key={index}
            className="text-center p-6 sm:p-8 rounded-3xl shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-98 transition-all border border-white/30 bg-white/15 backdrop-blur-2xl min-h-[280px] flex flex-col justify-center"
          >
            <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <feature.icon size={40} className={feature.iconColor} />
            </div>
            <h3 className="text-2xl font-bold text-pool-navy mb-4">{feature.title}</h3>
            <p className="text-pool-navy text-lg">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Mobile Carousel Layout */}
      <div className="md:hidden relative">
        <div className="overflow-hidden" ref={emblaRef} style={{ touchAction: 'pan-y pinch-zoom' }}>
          <div className="flex" style={{ backfaceVisibility: 'hidden' }}>
            {features.map((feature, index) => (
              <div key={index} className="flex-[0_0_100%] min-w-0">
                <div className="text-center p-6 rounded-3xl shadow-xl border border-white/30 bg-white/15 backdrop-blur-2xl mx-4 h-[320px] flex flex-col justify-center">
                  <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                    <feature.icon size={40} className={feature.iconColor} />
                  </div>
                  <h3 className="text-2xl font-bold text-pool-navy mb-4">{feature.title}</h3>
                  <p className="text-pool-navy text-lg">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Small Dots Indicator */}
        <div className="flex justify-center mt-4 gap-1">
          {features.map((_, index) => (
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
              aria-label={`Go to feature ${index + 1}`}
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
