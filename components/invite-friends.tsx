"use client"

import { detectClientLocation } from "@/lib/location-utils"
import { AlertCircle, Check, Copy, Send, Share2, UserPlus } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"

type FriendStatus = "idle" | "submitting" | "success" | "duplicate" | "error"

interface InviteFriendsProps {
  /** Optional headline override. */
  headline?: string
  /** Optional sub-text override. */
  subtext?: string
  /**
   * Path on this origin that the "share link" should point to. Defaults to
   * the pre-register page; override on the questionnaire flow so friends land
   * on the survey instead.
   */
  sharePath?: string
  className?: string
}

export function InviteFriends({
  headline = "Bring a friend along",
  subtext = "Add a friend's name and email to pre-register them.",
  sharePath = "/preregister",
  className = "",
}: InviteFriendsProps) {
  const [friend, setFriend] = useState({ firstName: "", lastName: "", email: "" })
  const [status, setStatus] = useState<FriendStatus>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [lastInvited, setLastInvited] = useState<string | null>(null)

  const [shareLink, setShareLink] = useState("")
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareLink(`${window.location.origin}${sharePath}`)
      setCanShare(typeof (navigator as any)?.share === "function")
    }
  }, [sharePath])

  const isFriendValid =
    friend.firstName.trim() !== "" &&
    friend.lastName.trim() !== "" &&
    friend.email.trim() !== "" &&
    /\S+@\S+\.\S+/.test(friend.email.trim())

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isFriendValid || status === "submitting") return

    setStatus("submitting")
    setErrorMsg(null)

    try {
      const res = await fetch("/api/preregister", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: friend.firstName.trim(),
          lastName: friend.lastName.trim(),
          email: friend.email.trim().toLowerCase(),
          clientLocation: detectClientLocation(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === "USER_ALREADY_EXISTS") {
          setStatus("duplicate")
          setErrorMsg(`${friend.email.trim()} is already on the list.`)
        } else {
          setStatus("error")
          setErrorMsg(data.error || "Something went wrong. Please try again.")
        }
        return
      }

      setLastInvited(`${friend.firstName.trim()} ${friend.lastName.trim()}`)
      setStatus("success")
      setFriend({ firstName: "", lastName: "", email: "" })
    } catch {
      setStatus("error")
      setErrorMsg("Network error. Please try again.")
    }
  }

  const copyLink = async () => {
    if (!shareLink) return
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: leave copied as false
    }
  }

  const nativeShare = async () => {
    if (!shareLink) return
    if (canShare) {
      try {
        await (navigator as any).share({
          title: "POOL — Pre-register",
          text: "Check out POOL and pre-register to be one of the first to use it.",
          url: shareLink,
        })
      } catch {
        // User cancelled — ignore
      }
    } else {
      copyLink()
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Refer a friend */}
      <div className="bg-white/30 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-lg border border-white/40">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-pool-pink to-pool-purple p-2 rounded-full">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-pool-navy text-shadow">
            {headline}
          </h3>
        </div>
        <p className="text-sm text-pool-navy/80 mb-5">{subtext}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={friend.firstName}
              onChange={(e) => {
                setFriend((f) => ({ ...f, firstName: e.target.value }))
                if (status !== "submitting") setStatus("idle")
              }}
              placeholder="Friend's first name"
              className="w-full px-4 py-3 rounded-full border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors text-sm"
              disabled={status === "submitting"}
            />
            <input
              type="text"
              value={friend.lastName}
              onChange={(e) => {
                setFriend((f) => ({ ...f, lastName: e.target.value }))
                if (status !== "submitting") setStatus("idle")
              }}
              placeholder="Friend's last name"
              className="w-full px-4 py-3 rounded-full border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors text-sm"
              disabled={status === "submitting"}
            />
          </div>
          <input
            type="email"
            value={friend.email}
            onChange={(e) => {
              setFriend((f) => ({ ...f, email: e.target.value }))
              if (status !== "submitting") setStatus("idle")
            }}
            placeholder="friend@email.com"
            className="w-full px-4 py-3 rounded-full border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors text-sm"
            disabled={status === "submitting"}
          />

          <button
            type="submit"
            disabled={!isFriendValid || status === "submitting"}
            className="w-full bg-gradient-to-r from-pool-blue to-pool-green hover:from-pool-green hover:to-pool-blue text-white font-bold py-3 px-6 rounded-full text-sm transform hover:scale-[1.02] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {status === "submitting" ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending invite…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Pre-register friend
              </>
            )}
          </button>
        </form>

        {status === "success" && (
          <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-2xl flex items-start gap-2">
            <Check className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">
              {lastInvited ? `${lastInvited} is on the list!` : "Friend pre-registered!"} Add another below or share the link.
            </p>
          </div>
        )}

        {(status === "error" || status === "duplicate") && errorMsg && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-2xl flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Share link */}
      <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-lg border border-white/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-pool-blue to-pool-green p-2 rounded-full">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-pool-navy text-shadow">
            Or share this link
          </h3>
        </div>
        <p className="text-sm text-pool-navy/80 mb-4">
          Send them straight to the pre-register page — they’ll be on the list in seconds.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="flex-1 px-6 py-3 rounded-full bg-pool-navy text-white text-sm font-bold hover:bg-pool-navy/90 transition-colors flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copy link
              </>
            )}
          </button>
          <button
            type="button"
            onClick={nativeShare}
            className="flex-1 px-6 py-3 rounded-full bg-pool-pink text-white text-sm font-bold hover:bg-pool-pink/90 transition-colors flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </div>
    </div>
  )
}
