"use client"

import { InviteFriendsModal } from "@/components/invite-friends-modal"
import { detectClientLocation } from "@/lib/location-utils"
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Sparkles, UserPlus, X } from "lucide-react"
import BrandPattern from "@/components/brand/pattern"
import type React from "react"
import { useState } from "react"

interface FormData {
  firstName: string
  lastName: string
  email: string
}

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
  friendFirstName?: string
  friendLastName?: string
  friendEmail?: string
}

interface FriendData {
  firstName: string
  lastName: string
  email: string
}

export default function PreregisterPage() {
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error" | "duplicate">("idle")

  const [friendOpen, setFriendOpen] = useState(false)
  const [friendData, setFriendData] = useState<FriendData>({ firstName: "", lastName: "", email: "" })
  const [friendOutcome, setFriendOutcome] = useState<"idle" | "success" | "duplicate" | "error">("idle")
  const [friendOutcomeMsg, setFriendOutcomeMsg] = useState<string | null>(null)

  const [showInviteModal, setShowInviteModal] = useState(false)

  const friendHasAnyInput =
    friendData.firstName.trim() !== "" ||
    friendData.lastName.trim() !== "" ||
    friendData.email.trim() !== ""

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required"
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required"
    if (!formData.email.trim()) newErrors.email = "Email is required"
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Please enter a valid email address"

    // Friend validation: only required if the user actually started filling in
    // the friend's info (or expanded the section without leaving it empty).
    if (friendOpen && friendHasAnyInput) {
      if (!friendData.firstName.trim()) newErrors.friendFirstName = "Friend's first name is required"
      if (!friendData.lastName.trim()) newErrors.friendLastName = "Friend's last name is required"
      if (!friendData.email.trim()) newErrors.friendEmail = "Friend's email is required"
      else if (!/\S+@\S+\.\S+/.test(friendData.email)) newErrors.friendEmail = "Please enter a valid email"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value })
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined })
    }
  }

  const preregisterUser = async (payload: { firstName: string; lastName: string; email: string }) => {
    const response = await fetch("/api/preregister", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        email: payload.email.trim().toLowerCase(),
        clientLocation: detectClientLocation(),
      }),
    })

    const data = await response.json().catch(() => ({}))
    return { ok: response.ok, code: data?.code as string | undefined, error: data?.error as string | undefined }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    setSubmitStatus("idle")
    setFriendOutcome("idle")
    setFriendOutcomeMsg(null)

    // 1. Register the main user
    let mainStatus: "success" | "duplicate" | "error" = "success"
    try {
      const result = await preregisterUser(formData)
      if (!result.ok) {
        mainStatus = result.code === "USER_ALREADY_EXISTS" ? "duplicate" : "error"
      }
    } catch {
      mainStatus = "error"
    }
    setSubmitStatus(mainStatus)

    // 2. If a friend is filled in, register them too (best effort — main user
    //    success isn't blocked by friend issues).
    const shouldRegisterFriend = friendOpen && friendHasAnyInput
    if (shouldRegisterFriend) {
      const friendName = `${friendData.firstName.trim()} ${friendData.lastName.trim()}`.trim()
      try {
        const result = await preregisterUser(friendData)
        if (result.ok) {
          setFriendOutcome("success")
          setFriendOutcomeMsg(`${friendName} is on the list too!`)
        } else if (result.code === "USER_ALREADY_EXISTS") {
          setFriendOutcome("duplicate")
          setFriendOutcomeMsg(`${friendData.email.trim()} is already on the list.`)
        } else {
          setFriendOutcome("error")
          setFriendOutcomeMsg(result.error || "Couldn't add your friend — try again from the popup.")
        }
      } catch {
        setFriendOutcome("error")
        setFriendOutcomeMsg("Couldn't add your friend — try again from the popup.")
      }
    }

    // Clear forms + open the popup if the main registration worked
    if (mainStatus === "success") {
      setFormData({ firstName: "", lastName: "", email: "" })
      setFriendData({ firstName: "", lastName: "", email: "" })
      setFriendOpen(false)
      setShowInviteModal(true)
    }

    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen py-20 bg-tint-yellow relative overflow-hidden">
      <BrandPattern variant="money" opacity={0.3} />
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-navy mb-4">
              Preregister for Pool
            </h1>
            <p className="text-lg sm:text-xl text-navy/80">
              Be the first to know when our mobile app launches!
            </p>
          </div>

          {/* Form Card */}
          <div className="sticker rounded-3xl bg-white p-6 sm:p-8">
            {/* Success Message */}
            {submitStatus === "success" && (
              <div className="rounded-3xl border-2 border-navy bg-sky-tint p-8 mb-8 shadow-[4px_4px_0_#14224A]">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="bg-pool-green border-2 border-navy p-4 rounded-full">
                      <CheckCircle className="w-12 h-12 text-navy" />
                    </div>
                  </div>
                  <h3 className="font-display font-bold text-3xl text-navy mb-4">
                    You're on the VIP List!
                  </h3>
                  <p className="text-xl font-semibold text-navy mb-2">
                    Get ready for exclusive early access to POOL.
                  </p>
                  <p className="text-lg text-navy/80">
                    We'll notify you first when our mobile app launches!
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {submitStatus === "error" && (
              <div className="mb-8 p-6 bg-pool-pink/15 border-2 border-navy rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-pool-pink flex-shrink-0" />
                <div>
                  <p className="text-lg font-bold text-navy">
                    Something went wrong. Please try again.
                  </p>
                  <p className="text-navy/80 mt-1">
                    If the problem persists, please contact support.
                  </p>
                </div>
              </div>
            )}

            {/* Duplicate Message */}
            {submitStatus === "duplicate" && (
              <div className="mb-8 p-6 bg-pool-yellow/20 border-2 border-navy rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-pool-gold flex-shrink-0" />
                <div>
                  <p className="text-lg font-bold text-navy">
                    You have already preregistered.
                  </p>
                  <p className="text-navy/80 mt-1">
                    We'll notify you as soon as the mobile app is available!
                  </p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* First Name */}
              <div>
                <label className="block text-navy font-bold mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  className={`w-full px-4 py-3 rounded-full border-2 ${errors.firstName
                    ? "border-red-400 focus:border-red-500"
                    : "border-navy focus:border-pool-blue"
                    } outline-none transition-colors`}
                  placeholder="Enter your first name"
                  disabled={isSubmitting}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-2 ml-4">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-navy font-bold mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  className={`w-full px-4 py-3 rounded-full border-2 ${errors.lastName
                    ? "border-red-400 focus:border-red-500"
                    : "border-navy focus:border-pool-blue"
                    } outline-none transition-colors`}
                  placeholder="Enter your last name"
                  disabled={isSubmitting}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-2 ml-4">{errors.lastName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-navy font-bold mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`w-full px-4 py-3 rounded-full border-2 ${errors.email
                    ? "border-red-400 focus:border-red-500"
                    : "border-navy focus:border-pool-blue"
                    } outline-none transition-colors`}
                  placeholder="your@email.com"
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-2 ml-4">{errors.email}</p>
                )}
              </div>

              {/* Add a friend (optional) */}
              <div className="rounded-2xl border-2 border-dashed border-navy/50 bg-sky-tint/50 p-4 sm:p-5">
                <button
                  type="button"
                  onClick={() => setFriendOpen((o) => !o)}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-between gap-3 text-left"
                  aria-expanded={friendOpen}
                  aria-controls="friend-fields"
                >
                  <span className="flex items-center gap-2 text-navy font-bold">
                    <UserPlus className="w-5 h-5" />
                    Add a friend
                  </span>
                  {friendOpen ? (
                    <ChevronUp className="w-5 h-5 text-navy" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-navy" />
                  )}
                </button>
                <p className="text-xs text-navy/70 mt-1">
                  Pre-register a friend at the same time — they’ll be on the list with you.
                </p>

                {friendOpen && (
                  <div id="friend-fields" className="mt-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          value={friendData.firstName}
                          onChange={(e) => {
                            setFriendData((f) => ({ ...f, firstName: e.target.value }))
                            if (errors.friendFirstName) setErrors({ ...errors, friendFirstName: undefined })
                          }}
                          placeholder="Friend's first name"
                          disabled={isSubmitting}
                          className={`w-full px-4 py-3 rounded-full border-2 ${errors.friendFirstName ? "border-red-400 focus:border-red-500" : "border-navy focus:border-pool-blue"} outline-none transition-colors text-sm`}
                        />
                        {errors.friendFirstName && (
                          <p className="text-red-500 text-xs mt-1 ml-4">{errors.friendFirstName}</p>
                        )}
                      </div>
                      <div>
                        <input
                          type="text"
                          value={friendData.lastName}
                          onChange={(e) => {
                            setFriendData((f) => ({ ...f, lastName: e.target.value }))
                            if (errors.friendLastName) setErrors({ ...errors, friendLastName: undefined })
                          }}
                          placeholder="Friend's last name"
                          disabled={isSubmitting}
                          className={`w-full px-4 py-3 rounded-full border-2 ${errors.friendLastName ? "border-red-400 focus:border-red-500" : "border-navy focus:border-pool-blue"} outline-none transition-colors text-sm`}
                        />
                        {errors.friendLastName && (
                          <p className="text-red-500 text-xs mt-1 ml-4">{errors.friendLastName}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <input
                        type="email"
                        value={friendData.email}
                        onChange={(e) => {
                          setFriendData((f) => ({ ...f, email: e.target.value }))
                          if (errors.friendEmail) setErrors({ ...errors, friendEmail: undefined })
                        }}
                        placeholder="friend@email.com"
                        disabled={isSubmitting}
                        className={`w-full px-4 py-3 rounded-full border-2 ${errors.friendEmail ? "border-red-400 focus:border-red-500" : "border-navy focus:border-pool-blue"} outline-none transition-colors text-sm`}
                      />
                      {errors.friendEmail && (
                        <p className="text-red-500 text-xs mt-1 ml-4">{errors.friendEmail}</p>
                      )}
                    </div>
                    {friendHasAnyInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setFriendData({ firstName: "", lastName: "", email: "" })
                          setErrors({ ...errors, friendFirstName: undefined, friendLastName: undefined, friendEmail: undefined })
                        }}
                        disabled={isSubmitting}
                        className="text-xs text-navy/70 hover:text-navy underline inline-flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Clear friend
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Friend outcome (after submit, if a friend was added) */}
              {friendOutcomeMsg && (
                <div
                  className={`p-3 rounded-2xl flex items-start gap-2 ${friendOutcome === "success"
                    ? "bg-green-100 border border-green-300"
                    : "bg-yellow-50 border border-yellow-300"
                    }`}
                >
                  {friendOutcome === "success" ? (
                    <CheckCircle className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
                  )}
                  <p
                    className={`text-sm ${friendOutcome === "success" ? "text-green-800" : "text-yellow-800"
                      }`}
                  >
                    {friendOutcomeMsg}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-sticker btn-pink w-full py-4 px-8 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-navy"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {friendOpen && friendHasAnyInput ? "Preregister us" : "Preregister"}
                  </>
                )}
              </button>
            </form>

            {/* Additional Info */}
            <div className="mt-8 p-6 bg-sky-tint border-2 border-navy/15 rounded-2xl">
              <p className="text-navy text-center text-sm">
                By preregistering, you'll be among the first to experience Pool—the social network
                for the things you actually do together. We'll send you exclusive early access!
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Pop-up: invite more friends + share link */}
      <InviteFriendsModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="You’re on the list!"
        description="Want to bring more friends along? Add another below or share the link."
      />
    </div>
  )
}
