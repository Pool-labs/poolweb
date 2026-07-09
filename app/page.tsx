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

      <section className="beta">
        <div className="hp-wrap">
          <span className="beta-pill">PRIVATE BETA</span>
          <p className="lead">Pool is in private beta right now—pre-register to help us shape it.</p>
          <p className="follow">Follow the journey on YouTube and keep up with us on Instagram.</p>
          <div className="beta-row">
            <Link className="hp-pill hp-pill-pink" href="/preregister">
              Pre-register for Beta
            </Link>
            <a className="hp-pill" href="https://www.youtube.com/@Pool_App" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="#14224A" aria-hidden="true">
                <path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.4-4.8ZM10 15.2V8.8l5.2 3.2Z" />
              </svg>
              YouTube
            </a>
            <a className="hp-pill" href="https://instagram.com/_poolapp" target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" stroke="#14224A" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4.2" />
                <circle cx="17.2" cy="6.8" r="1.3" fill="#14224A" stroke="none" />
              </svg>
              Instagram
            </a>
          </div>
        </div>
      </section>

      <HomeTicker />
      <Wtf />
      <SocialStory />
      <CardStage />
      <HowSteps />
      <Jump />
    </div>
  )
}
