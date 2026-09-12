"use client"

import { useEffect } from "react"
import { X } from "lucide-react"
import { InviteFriends } from "./invite-friends"

interface InviteFriendsModalProps {
  open: boolean
  onClose: () => void
  /** Headline at the top of the modal (above the InviteFriends content). */
  title?: string
  /** Sub-text under the title. */
  description?: string
  /** Override for the InviteFriends inner card headline. */
  headline?: string
  /** Override for the InviteFriends inner card subtext. */
  subtext?: string
  /** Path on this origin to share — defaults to /preregister. */
  sharePath?: string
}

export function InviteFriendsModal({
  open,
  onClose,
  title = "You’re on the list!",
  description = "Want to bring some friends along? Add them here or share the link.",
  headline,
  subtext,
  sharePath,
}: InviteFriendsModalProps) {
  // Lock the page beneath the modal without using `overflow: hidden` on
  // <body>, which breaks nested scrolling on Android Chrome. We freeze the
  // page by switching it to `position: fixed` while preserving the original
  // scroll position, then restore it on close.
  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)

    const scrollY = window.scrollY
    const body = document.body
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    }
    body.style.position = "fixed"
    body.style.top = `-${scrollY}px`
    body.style.left = "0"
    body.style.right = "0"
    body.style.width = "100%"

    return () => {
      document.removeEventListener("keydown", onKey)
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.left = prev.left
      body.style.right = prev.right
      body.style.width = prev.width
      window.scrollTo(0, scrollY)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto overscroll-contain"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-friends-modal-title"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {/* min-h-full + flex makes the modal centre when content fits AND
          scroll properly when content is taller than viewport — including
          on Android Chrome, which doesn't tolerate `items-center` + tall
          content the way iOS Safari does. */}
      <div className="min-h-full flex items-start sm:items-center justify-center p-4 py-6 sm:py-8">
        <div
          className="relative w-full max-w-lg rounded-3xl border-[2.5px] border-navy bg-white shadow-[6px_6px_0_#14224A] p-5 sm:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full border-2 border-navy bg-white hover:bg-sky-tint transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-navy" />
          </button>

          <div className="mb-5 pr-10">
            <h2
              id="invite-friends-modal-title"
              className="font-display font-bold text-xl sm:text-3xl text-navy"
            >
              {title}
            </h2>
            {description && (
              <p className="text-sm sm:text-base text-navy/80 mt-1">{description}</p>
            )}
          </div>

          <InviteFriends headline={headline} subtext={subtext} sharePath={sharePath} />
        </div>
      </div>
    </div>
  )
}
