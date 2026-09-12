"use client"

import { InviteFriendsModal } from "@/components/invite-friends-modal"
import { Bell, Gift, Sparkles, Star, UserPlus } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function SurveyConfirmationPage() {
  const [showConfetti, setShowConfetti] = useState(true)
  const [isComplete, setIsComplete] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [showInviteModal, setShowInviteModal] = useState(false)

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    setIsComplete(searchParams.get("complete") === "true")
    setFirstName(searchParams.get("firstName") || "")

    // Hide confetti after 5 seconds
    const timer = setTimeout(() => {
      setShowConfetti(false)
    }, 5000)

    // Auto-open the invite popup shortly after the page lands so it grabs
    // the user's attention without interrupting the success animation.
    const popupTimer = setTimeout(() => {
      setShowInviteModal(true)
    }, 800)

    return () => {
      clearTimeout(timer)
      clearTimeout(popupTimer)
    }
  }, [])

  return (
    <div className="min-h-screen py-20 relative overflow-hidden bg-sky-tint">
      {/* Animated confetti — only on complete submissions */}
      {showConfetti && isComplete && (
        <div className="absolute inset-0 z-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 5}s`,
              }}
            >
              <div
                className={`w-3 h-3 ${i % 3 === 0
                    ? "bg-pool-pink"
                    : i % 3 === 1
                      ? "bg-pool-yellow"
                      : "bg-pool-blue"
                  } rounded-full`}
              />
            </div>
          ))}
        </div>
      )}

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Success icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-pool-green to-pool-blue rounded-full flex items-center justify-center shadow-2xl animate-bounce-slow">
                <Gift className="w-16 h-16 text-white" />
              </div>
              <Sparkles className="absolute -top-4 -right-4 w-8 h-8 text-pool-yellow animate-pulse" />
              <Star className="absolute -bottom-4 -left-4 w-6 h-6 text-pool-pink animate-pulse" />
            </div>
          </div>

          {/* Thank you & early-access notice */}
          <div className="bg-gradient-to-r from-pool-pink/20 to-pool-yellow/20 backdrop-blur-sm rounded-3xl p-10 shadow-2xl border-2 border-white/40 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pool-yellow/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-pool-pink/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              {isComplete ? (
                <>
                  <h1 className="text-5xl font-bold text-pool-navy mb-6 text-shadow flex items-center justify-center gap-3">
                    <Sparkles className="w-12 h-12 text-pool-yellow animate-pulse" />
                    {firstName ? `Thanks, ${firstName}!` : "You're in!"}
                    <Sparkles className="w-12 h-12 text-pool-pink animate-pulse" />
                  </h1>
                  <p className="text-2xl font-bold text-pool-navy text-shadow leading-relaxed mb-3">
                    You’ll be one of the first to use POOL when we launch.
                  </p>
                  <p className="text-lg text-pool-navy/80 text-shadow">
                    Plus, you’re on the VIP list for our exclusive merch drop — we’ll email you to pick your free item.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-4xl font-bold text-pool-navy mb-6 text-shadow">
                    {firstName ? `Thanks for sharing, ${firstName}!` : "Thanks for sharing!"}
                  </h1>
                  <p className="text-xl text-pool-navy text-shadow mb-3">
                    You’ll be one of the first to use POOL when we launch — we’ll email you with your early-access link.
                  </p>
                  <p className="text-base text-pool-navy/80">
                    Want the exclusive merch drop and a free item too? Finish the remaining questions any time before launch.
                  </p>
                </>
              )}

              {/* What's next card */}
              <div className="mt-8 bg-gradient-to-r from-pool-blue/10 to-pool-green/10 rounded-2xl p-6 shadow-inner border border-white/20">
                <div className="flex items-center justify-center mb-3">
                  <Bell className="w-8 h-8 text-pool-navy" />
                </div>
                <h3 className="text-xl font-bold text-pool-navy mb-2">What happens next</h3>
                <ul className="text-pool-navy/80 text-sm sm:text-base space-y-2 text-left max-w-md mx-auto list-disc list-inside">
                  <li>We’ll email you the moment POOL is ready so you can be one of the first to use it.</li>
                  <li>If you’re on the merch list, we’ll send a separate email to claim your free item.</li>
                  <li>No further action needed — you’re all set.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Re-open the invite-friends popup if it was dismissed */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-pool-blue to-pool-green hover:from-pool-green hover:to-pool-blue text-white font-bold py-3 px-6 rounded-full text-base transform hover:scale-105 transition-all shadow-lg"
            >
              <UserPlus className="w-5 h-5" />
              Invite a friend
            </button>
          </div>

          {/* Return home */}
          <div className="mt-12 text-center">
            <Link
              href="/"
              className="text-pool-navy hover:text-pool-pink font-bold text-lg transition-colors hover:scale-110 transform inline-flex items-center gap-2"
            >
              ← Return to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Pop-up: invite friends + share link */}
      <InviteFriendsModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title={firstName ? `Thanks, ${firstName}!` : "You’re on the list!"}
        description="Want to bring a friend along? Add them below or share the questionnaire link."
        sharePath="/questionnaire"
      />
    </div>
  )
}
