import Link from "next/link"
import BrandDefs from "@/components/home/defs"
import HomeEffects from "@/components/home/effects"
import Hero from "@/components/home/hero"
import HomeTicker from "@/components/home/ticker"
import Wtf from "@/components/home/wtf"
import SocialStory from "@/components/home/social-story"
import CardStage from "@/components/home/card-stage"
import HowSteps from "@/components/home/how-steps"
import Jump from "@/components/home/jump"

export default function HomePage() {
  return (
    <div className="hp">
      {/* the wash + color blobs: the site's signature background, fixed under everything */}
      <div className="hp-wash" aria-hidden="true" />
      <div className="hp-blob hp-blob-pink" aria-hidden="true" />
      <div className="hp-blob hp-blob-orange" aria-hidden="true" />
      <div className="hp-blob hp-blob-teal" aria-hidden="true" />
      <div className="hp-blob hp-blob-blue" aria-hidden="true" />
      <div className="hp-blob hp-blob-yellow" aria-hidden="true" />

      <BrandDefs />
      <HomeEffects />

      <Hero />

      <HomeTicker />
      <Wtf />
      <SocialStory />
      <CardStage />
      <HowSteps />
      <Jump />
    </div>
  )
}
