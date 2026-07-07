import { StickerButton } from "@/components/sticker"
import { Droplet, Splash } from "@/components/brand/marks"
import Reveal from "@/components/reveal"

/**
 * Beta CTA — the velvet rope. "Ready to Jump In?" stays verbatim.
 */
export default function BetaCta() {
  return (
    <Reveal>
      <div className="relative max-w-3xl mx-auto text-center">
        <div className="sticker rounded-3xl bg-white px-6 py-12 sm:px-12 relative overflow-visible">
          <Splash color="yellow" className="absolute -top-7 -left-5 h-14 w-auto -rotate-12" />
          <Droplet color="pink" className="absolute -bottom-4 -right-3 h-10 w-auto rotate-12" />

          <h2 className="font-display font-extrabold text-4xl sm:text-5xl text-navy">Ready to Jump In?</h2>
          <p className="font-display font-bold text-2xl sm:text-3xl text-navy mt-5">
            The pool&rsquo;s not open yet.
          </p>
          <p className="text-lg text-navy/80 mt-2 max-w-md mx-auto">
            Pre-register and you&rsquo;re first in when it fills.
          </p>
          <div className="mt-8">
            <StickerButton href="/preregister" variant="pink" className="text-xl px-10 py-4">
              Pre-register for the beta
            </StickerButton>
          </div>
        </div>
      </div>
    </Reveal>
  )
}
