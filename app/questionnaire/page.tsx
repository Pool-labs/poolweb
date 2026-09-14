"use client"

import { detectClientLocation } from "@/lib/location-utils"
import { QUESTIONNAIRE_OPTIONS } from "@/lib/questionnaire-questions"
import { WAITLIST_LIMITS } from "@/lib/waitlist/limits"
import { AlertCircle, CheckSquare, ChevronRight, Gift, Globe, Square } from "lucide-react"
import { useRouter } from "next/navigation"
import type React from "react"
import { useEffect, useState } from "react"

type FormData = {
  prefunding: string
  prefundingWhy: string
  settlementMethods: string[]
  settlementMethodsOther: string
  settlementFeedback: string
  moneyInAir: string
  moneyInAirAmount: string
  weeklySpend: string
  splitTypes: string[]
  splitTypesOther: string
  hangoutPoolWillingness: string
  hangoutPoolWhy: string
  socialFeatures: string[]
  socialFeaturesOther: string
  friendConversion: string
  firstName: string
  lastName: string
  email: string
}

const initialFormData: FormData = {
  prefunding: "",
  prefundingWhy: "",
  settlementMethods: [],
  settlementMethodsOther: "",
  settlementFeedback: "",
  moneyInAir: "",
  moneyInAirAmount: "",
  weeklySpend: "",
  splitTypes: [],
  splitTypesOther: "",
  hangoutPoolWillingness: "",
  hangoutPoolWhy: "",
  socialFeatures: [],
  socialFeaturesOther: "",
  friendConversion: "",
  firstName: "",
  lastName: "",
  email: "",
}

const STORAGE_KEY = "survey_progress"

// Helper function to check if form data is complete
function checkIfFormDataComplete(data: FormData): boolean {
  // Q1 prefunding + why
  if (!data.prefunding || !data.prefundingWhy.trim()) return false;
  // Q2 settlement methods + feedback
  if (data.settlementMethods.length === 0) return false;
  if (data.settlementMethods.includes("Other") && !data.settlementMethodsOther.trim()) return false;
  if (!data.settlementFeedback.trim()) return false;
  // Q3 money in air
  if (!data.moneyInAir) return false;
  // Q4 weekly spend
  if (!data.weeklySpend.trim() || isNaN(Number(data.weeklySpend))) return false;
  // Q5 split types
  if (data.splitTypes.length === 0) return false;
  if (data.splitTypes.includes("Other") && !data.splitTypesOther.trim()) return false;
  // Q6 hangout/pool willingness (why is optional)
  if (!data.hangoutPoolWillingness) return false;
  // Q7 social features
  if (data.socialFeatures.length === 0) return false;
  if (data.socialFeatures.includes("Other") && !data.socialFeaturesOther.trim()) return false;
  // Q8 friend conversion
  if (!data.friendConversion) return false;

  return true;
}

export default function SurveyPage() {
  const router = useRouter()
  // Initialize with the empty form. localStorage is read in the mount effect
  // below to avoid SSR/CSR hydration mismatches.
  const [formData, setFormData] = useState<FormData>(initialFormData)

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactErrors, setContactErrors] = useState<Partial<FormData>>({})
  const [questionsAnswered, setQuestionsAnswered] = useState(0)
  const [showWarning, setShowWarning] = useState(false)
  const [isPartialSubmission, setIsPartialSubmission] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [showDuplicateMessage, setShowDuplicateMessage] = useState(false)
  const [hasVisitedSite, setHasVisitedSite] = useState<boolean | null>(null)
  const [showSiteVisitModal, setShowSiteVisitModal] = useState(false)
  const [userEmail, setUserEmail] = useState<string>("")
  // One-time token from the questionnaire response; the follow-up site-visit
  // answer is only recorded when it comes with this.
  const [siteVisitToken, setSiteVisitToken] = useState<string>("")

  const totalSteps = 4
  const totalQuestions = 8

  // Initial localStorage load — runs once on mount, after hydration. Keeping
  // it inside an effect (not inside useState's initializer) ensures the SSR
  // and first client render produce identical HTML.
  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem(STORAGE_KEY)
      if (savedProgress) {
        const parsedData = JSON.parse(savedProgress)
        if (checkIfFormDataComplete(parsedData)) {
          // Already-complete survey — clear it so the user starts fresh
          localStorage.removeItem(STORAGE_KEY)
        } else {
          // Merge so newly-introduced fields exist
          setFormData({ ...initialFormData, ...parsedData })
        }
      }
    } catch {
      // Bad JSON or storage unavailable — start fresh
    }
    setIsInitialized(true)
  }, [])

  // Reload saved progress when the tab regains focus / page becomes visible /
  // user navigates back. Only attached after the initial load.
  useEffect(() => {
    if (!isInitialized) return

    const loadSavedProgress = () => {
      try {
        const savedProgress = localStorage.getItem(STORAGE_KEY)
        if (savedProgress) {
          const parsedProgress = JSON.parse(savedProgress)
          if (Object.values(parsedProgress).some(value =>
            value !== "" &&
            (Array.isArray(value) ? value.length > 0 : true)
          )) {
            setFormData({ ...initialFormData, ...parsedProgress })
          }
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadSavedProgress()
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) loadSavedProgress()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('focus', loadSavedProgress)
    window.addEventListener('pageshow', loadSavedProgress)
    window.addEventListener('popstate', loadSavedProgress)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', loadSavedProgress)
      window.removeEventListener('pageshow', loadSavedProgress)
      window.removeEventListener('popstate', loadSavedProgress)
    }
  }, [isInitialized])

  // Save progress whenever form data changes — but only once we've completed
  // the initial load, so we don't overwrite saved data with the empty seed.
  useEffect(() => {
    if (!isInitialized) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
    } catch {
      // Storage unavailable — silently skip
    }
  }, [formData, isInitialized])

  // Calculate questions answered whenever form data changes
  useEffect(() => {
    let answered = 0;

    // Q1: Prefunding + why
    if (formData.prefunding && formData.prefundingWhy.trim()) answered++

    // Q2: Settlement methods + feedback
    if (
      formData.settlementMethods.length > 0 &&
      (!formData.settlementMethods.includes("Other") || formData.settlementMethodsOther.trim()) &&
      formData.settlementFeedback.trim()
    ) answered++

    // Q3: Money in air
    if (formData.moneyInAir) answered++

    // Q4: Weekly spend
    if (formData.weeklySpend.trim() && !isNaN(Number(formData.weeklySpend))) answered++

    // Q5: Split types (checkbox)
    if (formData.splitTypes.length > 0) {
      if (!formData.splitTypes.includes("Other")) {
        answered++
      } else if (formData.splitTypesOther.trim()) {
        answered++
      }
    }

    // Q6: Hangout / pool willingness (why is optional)
    if (formData.hangoutPoolWillingness) answered++

    // Q7: Social features
    if (formData.socialFeatures.length > 0) {
      if (!formData.socialFeatures.includes("Other")) {
        answered++
      } else if (formData.socialFeaturesOther.trim()) {
        answered++
      }
    }

    // Q8: Friend conversion
    if (formData.friendConversion) answered++

    setQuestionsAnswered(answered)
  }, [formData])

  const handleInputChange = (field: keyof FormData, value: string | string[]) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleCheckboxChange = (field: "splitTypes" | "socialFeatures" | "settlementMethods", value: string) => {
    const currentValues = formData[field] as string[]
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value]
    handleInputChange(field, newValues)
  }

  const isAllQuestionsAnswered = (): boolean => {
    return checkIfFormDataComplete(formData)
  }

  const validateContactInfo = (): boolean => {
    const errors: Partial<FormData> = {}
    if (!formData.firstName.trim()) errors.firstName = "Please enter your first name"
    if (!formData.lastName.trim()) errors.lastName = "Please enter your last name"
    if (!formData.email.trim()) errors.email = "Please enter your email"
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = "Please enter a valid email"

    setContactErrors(errors)


    return Object.keys(errors).length === 0
  }

  const isQuestionAnswered = (questionNumber: number): boolean => {
    switch (questionNumber) {
      case 1: return Boolean(formData.prefunding && formData.prefundingWhy.trim())
      case 2: return Boolean(
        formData.settlementMethods.length > 0 &&
        (!formData.settlementMethods.includes("Other") || formData.settlementMethodsOther.trim()) &&
        formData.settlementFeedback.trim()
      )
      case 3: return Boolean(formData.moneyInAir)
      case 4: return Boolean(formData.weeklySpend.trim() && !isNaN(Number(formData.weeklySpend)))
      case 5: return Boolean(formData.splitTypes.length > 0 && (!formData.splitTypes.includes("Other") || formData.splitTypesOther.trim()))
      case 6: return Boolean(formData.hangoutPoolWillingness)
      case 7: return Boolean(formData.socialFeatures.length > 0 && (!formData.socialFeatures.includes("Other") || formData.socialFeaturesOther.trim()))
      case 8: return Boolean(formData.friendConversion)
      default: return false
    }
  }

  const getQuestionStep = (questionNumber: number): number => {
    if (questionNumber <= 2) return 1
    if (questionNumber <= 4) return 2
    if (questionNumber <= 6) return 3
    return 4
  }

  const findFirstUnansweredQuestion = (): number => {
    for (let i = 1; i <= totalQuestions; i++) {
      if (!isQuestionAnswered(i)) {
        return i
      }
    }
    return 1
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
      // Scroll to top of page
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      // Scroll to top of page
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  }

  const handleQuestionClick = (questionNumber: number) => {
    setCurrentStep(getQuestionStep(questionNumber))
    // Scroll to top of page
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }

  const handleSurveySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const isComplete = isAllQuestionsAnswered()
    setIsPartialSubmission(!isComplete)
    if (!isComplete) {
      setShowWarning(true)
      // Scroll to the warning message smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    setShowContactForm(true)
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateContactInfo()) return

    // Store email for later use
    setUserEmail(formData.email)

    // Submit; the site-visit follow-up is asked once the submission succeeds
    await submitForm()
  }

  const handleSiteVisitUpdate = async (visited: boolean) => {
    try {
      // Record the site-visit answer (server-side, token-gated)
      const response = await fetch("/api/update-site-visit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail || formData.email,
          hasVisitedSite: visited,
          siteVisitToken,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update site visit status")
      }

      // Close modal and navigate to confirmation
      setShowSiteVisitModal(false)

      const params = new URLSearchParams({
        complete: String(!isPartialSubmission),
        updated: 'true',
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        email: formData.email || ''
      })
      router.push(`/questionnaire/confirmation?${params}`)
    } catch (error) {
      console.error("Error updating site visit:", error)
      alert("An error occurred. Please try again.")
    }
  }

  const submitForm = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/questionnaire", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          clientLocation: detectClientLocation()
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.code === "SURVEY_ALREADY_COMPLETED") {
          setShowDuplicateMessage(true)
          setShowContactForm(false)
          return
        }
        throw new Error("Failed to submit survey")
      }

      const result = await response.json()

      // Clear saved progress if survey is now 100% complete
      if (isAllQuestionsAnswered()) {
        // All questions answered, clearing saved progress
        localStorage.removeItem(STORAGE_KEY)
      }

      // The response is deliberately the same whether this email was new or
      // already on the list, so the follow-up question is always asked; the
      // server records the answer only if none is stored yet.
      setSiteVisitToken(typeof result.siteVisitToken === "string" ? result.siteVisitToken : "")
      setShowSiteVisitModal(true)
    } catch (error) {
      console.error("Survey submission error:", error)
      alert("An error occurred while submitting the survey. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showDuplicateMessage) {
    return (
      <div className="min-h-screen py-20 bg-sky-tint">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold text-pool-navy mb-8 text-center text-shadow">
              Questionnaire Already Completed
            </h2>

            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/30">
              <div className="mb-8 p-6 bg-yellow-100 border-2 border-yellow-400 rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
                <div>
                  <p className="text-lg font-bold text-yellow-800">
                    You have already completed the questionnaire.
                  </p>
                  <p className="text-yellow-700 mt-1">
                    Thank you for your previous submission! We appreciate your feedback.
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => router.push("/")}
                  className="bg-pool-orange text-white font-bold py-3 px-8 rounded-full hover:scale-105 transition-transform shadow-lg"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showContactForm) {
    return (
      <>
        {/* Site Visit Modal */}
        {showSiteVisitModal && (
          <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50"
            style={{
              zIndex: 9999,
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)'
            }}
            onClick={() => setShowSiteVisitModal(false)}
          >
            <div
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
              style={{
                backgroundColor: 'white',
                position: 'relative',
                zIndex: 10000
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <Globe className="w-12 h-12 text-pool-navy" />
                </div>
                <h3 className="text-2xl font-bold text-pool-navy mb-4">
                  One Quick Question!
                </h3>
                <p className="text-lg text-pool-navy mb-6">
                  Have you explored our site before taking this questionnaire?
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    type="button"
                    onClick={() => handleSiteVisitUpdate(true)}
                    className="px-12 py-3 rounded-full font-medium bg-pool-green text-white hover:bg-pool-green/90 transition-all transform hover:scale-105"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSiteVisitUpdate(false)}
                    className="px-12 py-3 rounded-full font-medium bg-pool-pink text-white hover:bg-pool-pink/90 transition-all transform hover:scale-105"
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="min-h-screen py-20 bg-sky-tint">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-4xl font-bold text-pool-navy mb-8 text-center text-shadow">
                Almost Done!
              </h2>

              <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/30">
                <div className="mb-8 ">
                  {isPartialSubmission ? (
                    <>
                      <div className="mb-8 bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-6">
                        <p className="text-lg font-bold text-yellow-800 flex items-center justify-center gap-2 text-center">
                          Finish the remaining questions to unlock the exclusive merch drop and claim a free item of your choice.
                        </p>
                        <p className="text-yellow-800 text-center mt-2">
                          {questionsAnswered} of {totalQuestions} questions answered
                        </p>
                      </div>
                      <div className="mb-8">
                        <p className="text-lg text-pool-navy mb-4 text-center text-shadow">
                          Thanks for sharing your thoughts!
                        </p>
                        <p className="text-sm text-pool-navy/80 mb-4 text-center">
                          Drop your contact info — you’ll be among the first to use POOL when we launch. You can still submit now, or finish the remaining questions to also unlock our exclusive merch drop.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="mb-8">
                      <p className="text-lg text-pool-navy mb-4 text-center text-shadow">
                        Drop your contact info — you’ll be among the first to use POOL when we launch.
                      </p>
                      <p className="text-sm text-pool-navy/80 text-center">
                        You’ve completed every question, so you’ve also unlocked our exclusive merch drop and your free item of choice.
                      </p>
                    </div>
                  )}
                </div>

                <form onSubmit={handleFinalSubmit} className="space-y-6">
                  <div>
                    <label className="block text-pool-navy font-bold mb-2 text-shadow">First Name<span className="text-red-500 ml-1">*</span></label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => {
                        handleInputChange("firstName", e.target.value)
                        setContactErrors({ ...contactErrors, firstName: "" })
                      }}
                      className="w-full px-4 py-3 rounded-full border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors"
                      placeholder="Enter your first name"
                    />
                    {contactErrors.firstName && (
                      <p className="text-red-500 text-sm mt-2">{contactErrors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-pool-navy font-bold mb-2 text-shadow">Last Name<span className="text-red-500 ml-1">*</span></label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => {
                        handleInputChange("lastName", e.target.value)
                        setContactErrors({ ...contactErrors, lastName: "" })
                      }}
                      className="w-full px-4 py-3 rounded-full border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors"
                      placeholder="Enter your last name"
                    />
                    {contactErrors.lastName && (
                      <p className="text-red-500 text-sm mt-2">{contactErrors.lastName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-pool-navy font-bold mb-2 text-shadow">Email<span className="text-red-500 ml-1">*</span></label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        handleInputChange("email", e.target.value)
                        setContactErrors({ ...contactErrors, email: "" })
                      }}
                      className="w-full px-4 py-3 rounded-full border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors"
                      placeholder="your@email.com"
                    />
                    {contactErrors.email && (
                      <p className="text-red-500 text-sm mt-2">{contactErrors.email}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowContactForm(false)
                        setShowWarning(false)
                        if (isPartialSubmission) {
                          const firstUnanswered = findFirstUnansweredQuestion()
                          setCurrentStep(getQuestionStep(firstUnanswered))
                        } else {
                          setCurrentStep(1)
                        }
                        // Scroll to top of page
                        setTimeout(() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }, 200);
                      }}
                      className="w-full bg-pool-blue hover:bg-pool-blue/80 text-white font-bold py-3 px-6 rounded-full transition-all flex items-center justify-center gap-2"
                    >
                      <span>←</span>
                      {isPartialSubmission ? "Back to Unanswered Questions" : "Review My Answers"}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-pool-pink to-pool-purple hover:from-pool-purple hover:to-pool-pink text-white font-bold py-4 px-8 rounded-full text-lg transform hover:scale-105 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Submitting...
                        </div>
                      ) : (
                        isPartialSubmission ? "Submit Questionnaire" : "Submit Questionnaire"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                Would you pre-fund for activities (put money in before the event)?
              </label>
              <div className="space-y-3">
                {QUESTIONNAIRE_OPTIONS.prefunding.map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-4 bg-white/30 rounded-2xl border-2 border-transparent hover:border-pool-blue cursor-pointer transition-all"
                  >
                    <input
                      type="radio"
                      name="prefunding"
                      value={option}
                      checked={formData.prefunding === option}
                      onChange={(e) => handleInputChange("prefunding", e.target.value)}
                      className="mr-3 w-5 h-5 text-pool-pink focus:ring-pool-pink"
                    />
                    <span className="text-pool-navy font-medium">{option}</span>
                  </label>
                ))}
              </div>
              {formData.prefunding && (
                <textarea
                  value={formData.prefundingWhy}
                  onChange={(e) => handleInputChange("prefundingWhy", e.target.value)}
                  maxLength={WAITLIST_LIMITS.MAX_LONG_ANSWER_LENGTH}
                  rows={2}
                  className="w-full mt-3 px-4 py-3 rounded-2xl border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors resize-none"
                  placeholder="Why?"
                />
              )}
            </div>

            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                How do you currently settle group expenses? (check all that apply)
              </label>
              <div className="space-y-3">
                {QUESTIONNAIRE_OPTIONS.settlementMethods.map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-4 bg-white/30 rounded-2xl border-2 border-transparent hover:border-pool-blue cursor-pointer transition-all"
                  >
                    <div className="mr-3">
                      {formData.settlementMethods.includes(option) ? (
                        <CheckSquare className="w-5 h-5 text-pool-pink" />
                      ) : (
                        <Square className="w-5 h-5 text-pool-navy" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      value={option}
                      checked={formData.settlementMethods.includes(option)}
                      onChange={() => handleCheckboxChange("settlementMethods", option)}
                      className="sr-only"
                    />
                    <span className="text-pool-navy font-medium">{option}</span>
                  </label>
                ))}
              </div>
              {formData.settlementMethods.includes("Other") && (
                <input
                  type="text"
                  value={formData.settlementMethodsOther}
                  onChange={(e) => handleInputChange("settlementMethodsOther", e.target.value)}
                  maxLength={WAITLIST_LIMITS.MAX_SHORT_ANSWER_LENGTH}
                  className="w-full mt-3 px-4 py-3 rounded-full border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors"
                  placeholder="Please specify..."
                />
              )}
              <textarea
                value={formData.settlementFeedback}
                onChange={(e) => handleInputChange("settlementFeedback", e.target.value)}
                maxLength={WAITLIST_LIMITS.MAX_LONG_ANSWER_LENGTH}
                rows={3}
                className="w-full mt-3 px-4 py-3 rounded-2xl border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors resize-none"
                placeholder="What do you like or dislike about how you currently settle?"
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-8">
            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                Do you think there's money "in the air" right now — money owed to you, or that you owe to friends?
              </label>
              <div className="space-y-3">
                {QUESTIONNAIRE_OPTIONS.moneyInAir.map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-4 bg-white/30 rounded-2xl border-2 border-transparent hover:border-pool-blue cursor-pointer transition-all"
                  >
                    <input
                      type="radio"
                      name="moneyInAir"
                      value={option}
                      checked={formData.moneyInAir === option}
                      onChange={(e) => handleInputChange("moneyInAir", e.target.value)}
                      className="mr-3 w-5 h-5 text-pool-pink focus:ring-pool-pink"
                    />
                    <span className="text-pool-navy font-medium">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                How much do you spend weekly with other people (friends, roommates, family, coworkers, etc.)?
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={formData.weeklySpend}
                onChange={(e) => handleInputChange("weeklySpend", e.target.value)}
                className="w-full px-4 py-3 rounded-full border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors"
                placeholder="Enter weekly amount in dollars"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-8">
            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                What kinds of things do you usually split? (check all that apply)
              </label>
              <div className="space-y-3">
                {QUESTIONNAIRE_OPTIONS.splitTypes.map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-4 bg-white/30 rounded-2xl border-2 border-transparent hover:border-pool-blue cursor-pointer transition-all"
                  >
                    <div className="mr-3">
                      {formData.splitTypes.includes(option) ? (
                        <CheckSquare className="w-5 h-5 text-pool-pink" />
                      ) : (
                        <Square className="w-5 h-5 text-pool-navy" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      value={option}
                      checked={formData.splitTypes.includes(option)}
                      onChange={() => handleCheckboxChange("splitTypes", option)}
                      className="sr-only"
                    />
                    <span className="text-pool-navy font-medium">{option}</span>
                  </label>
                ))}
              </div>
              {formData.splitTypes.includes("Other") && (
                <input
                  type="text"
                  value={formData.splitTypesOther}
                  onChange={(e) => handleInputChange("splitTypesOther", e.target.value)}
                  maxLength={WAITLIST_LIMITS.MAX_SHORT_ANSWER_LENGTH}
                  className="w-full mt-3 px-4 py-3 rounded-full border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors"
                  placeholder="Please specify..."
                />
              )}
            </div>

            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                Are you willing to hang out with random people with similar interests AND pool money together?
              </label>
              <div className="space-y-3">
                {QUESTIONNAIRE_OPTIONS.hangoutPoolWillingness.map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-4 bg-white/30 rounded-2xl border-2 border-transparent hover:border-pool-blue cursor-pointer transition-all"
                  >
                    <input
                      type="radio"
                      name="hangoutPoolWillingness"
                      value={option}
                      checked={formData.hangoutPoolWillingness === option}
                      onChange={(e) => handleInputChange("hangoutPoolWillingness", e.target.value)}
                      className="mr-3 w-5 h-5 text-pool-pink focus:ring-pool-pink"
                    />
                    <span className="text-pool-navy font-medium">{option}</span>
                  </label>
                ))}
              </div>
              {formData.hangoutPoolWillingness && (
                <textarea
                  value={formData.hangoutPoolWhy}
                  onChange={(e) => handleInputChange("hangoutPoolWhy", e.target.value)}
                  maxLength={WAITLIST_LIMITS.MAX_LONG_ANSWER_LENGTH}
                  rows={2}
                  className="w-full mt-3 px-4 py-3 rounded-2xl border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors resize-none"
                  placeholder="Why?"
                />
              )}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-8">
            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                Would you care about social features in a money app? (check all that apply)
              </label>
              <div className="space-y-3">
                {QUESTIONNAIRE_OPTIONS.socialFeatures.map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-4 bg-white/30 rounded-2xl border-2 border-transparent hover:border-pool-blue cursor-pointer transition-all"
                  >
                    <div className="mr-3">
                      {formData.socialFeatures.includes(option) ? (
                        <CheckSquare className="w-5 h-5 text-pool-pink" />
                      ) : (
                        <Square className="w-5 h-5 text-pool-navy" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      value={option}
                      checked={formData.socialFeatures.includes(option)}
                      onChange={() => handleCheckboxChange("socialFeatures", option)}
                      className="sr-only"
                    />
                    <span className="text-pool-navy font-medium">{option}</span>
                  </label>
                ))}
              </div>
              {formData.socialFeatures.includes("Other") && (
                <input
                  type="text"
                  value={formData.socialFeaturesOther}
                  onChange={(e) => handleInputChange("socialFeaturesOther", e.target.value)}
                  maxLength={WAITLIST_LIMITS.MAX_SHORT_ANSWER_LENGTH}
                  className="w-full mt-3 px-4 py-3 rounded-full border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors"
                  placeholder="Please specify..."
                />
              )}
            </div>

            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                If you wanted your friends to use POOL, how hard would it be to get them to join?
              </label>
              <div className="space-y-3">
                {QUESTIONNAIRE_OPTIONS.friendConversion.map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-4 bg-white/30 rounded-2xl border-2 border-transparent hover:border-pool-blue cursor-pointer transition-all"
                  >
                    <input
                      type="radio"
                      name="friendConversion"
                      value={option}
                      checked={formData.friendConversion === option}
                      onChange={(e) => handleInputChange("friendConversion", e.target.value)}
                      className="mr-3 w-5 h-5 text-pool-pink focus:ring-pool-pink"
                    />
                    <span className="text-pool-navy font-medium">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <>
      {/* Site Visit Modal - Moved to top level */}
      {showSiteVisitModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50"
          style={{
            zIndex: 9999,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
          onClick={() => setShowSiteVisitModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            style={{
              backgroundColor: 'white',
              position: 'relative',
              zIndex: 10000
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <Globe className="w-12 h-12 text-pool-navy" />
              </div>
              <h3 className="text-2xl font-bold text-pool-navy mb-4">
                One Quick Question!
              </h3>
              <p className="text-lg text-pool-navy mb-6">
                Have you explored our site before taking this questionnaire?
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => handleSiteVisitUpdate(true)}
                  className="px-12 py-3 rounded-full font-medium bg-pool-green text-white hover:bg-pool-green/90 transition-all transform hover:scale-105"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => handleSiteVisitUpdate(false)}
                  className="px-12 py-3 rounded-full font-medium bg-pool-pink text-white hover:bg-pool-pink/90 transition-all transform hover:scale-105"
                >
                  No
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen py-20 bg-sky-tint">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-bold text-pool-navy mb-8 text-center text-shadow">
              Questionnaire
            </h1>

            {/* VIP access banner */}
            <div className="bg-gradient-to-r from-pool-pink to-pool-purple rounded-3xl p-6 mb-8 text-white shadow-xl">
              <div className="flex items-center justify-center space-x-3">
                <p className="text-lg font-bold text-center text-shadow">
                  Answer all eight questions to get access to our exclusive merch drop and be the first to use POOL.
                </p>
              </div>
            </div>

            {/* Warning message for partial submission */}
            {showWarning && (
              <div className="mb-8 bg-yellow-100 border-2 border-yellow-400 rounded-3xl p-6">
                <p className="text-lg font-bold text-yellow-800 flex items-center justify-center gap-2">
                  To unlock VIP access to our exclusive merch drop, please complete the remaining questions.
                </p>
                <p className="text-yellow-800 text-center mt-2">
                  {questionsAnswered} of {totalQuestions} questions answered
                </p>
              </div>
            )}

            {/* Progress indicator */}
            <div className="mb-8 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-pool-navy font-bold text-lg">
                    {questionsAnswered} of {totalQuestions} questions answered
                  </span>
                  <span className="text-pool-navy font-bold text-lg">
                    {Math.round((questionsAnswered / totalQuestions) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-pool-blue to-pool-pink h-full rounded-full transition-all duration-300"
                    style={{ width: `${(questionsAnswered / totalQuestions) * 100}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProgress(!showProgress)}
                className="ml-4 p-2 rounded-full bg-white/30 hover:bg-white/40 transition-all"
                title="Show/Hide Progress Details"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-pool-navy"
                >
                  <path d="M21 12V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h7.5" />
                  <path d="M16 2v4" />
                  <path d="M8 2v4" />
                  <path d="M3 10h18" />
                  <path d="M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="m22 22-1.5-1.5" />
                </svg>
              </button>
            </div>

            {/* Progress Details Popup */}
            {showProgress && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                <div className="bg-white rounded-3xl p-6 shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-pool-navy">Question Progress</h3>
                    <button
                      onClick={() => setShowProgress(false)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-pool-navy"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid gap-3">
                    {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((questionNumber) => {
                      const isAnswered = isQuestionAnswered(questionNumber)
                      return (
                        <button
                          key={questionNumber}
                          onClick={() => {
                            handleQuestionClick(questionNumber)
                            setShowProgress(false)
                          }}
                          className={`p-3 rounded-xl text-left flex items-center gap-2 transition-all ${isAnswered
                            ? "bg-pool-blue/10 text-pool-blue hover:bg-pool-blue/20"
                            : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                            }`}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${isAnswered ? "bg-pool-blue text-white" : "bg-yellow-400 text-yellow-900"
                            }`}>
                            {questionNumber}
                          </span>
                          <span className="text-sm font-medium truncate">
                            {isAnswered ? "Completed" : "Not Answered"}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {isAllQuestionsAnswered() && currentStep < totalSteps && (
              <div className="mb-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowContactForm(true)
                    setIsPartialSubmission(false)
                  }}
                  className="bg-gradient-to-r from-pool-green to-pool-blue text-white font-bold py-3 px-8 rounded-full text-lg transform hover:scale-105 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <Gift className="w-5 h-5" />
                  Submit Now & Get VIP Access
                </button>
              </div>
            )}

            {/* Form content */}
            <form onSubmit={handleSurveySubmit} className="survey-questions-area bg-white/20 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/30">
              {renderStep()}

              {/* Navigation buttons */}
              <div className="mt-8 flex justify-between">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="bg-gray-300 hover:bg-gray-400 text-pool-navy font-bold py-3 px-6 mr-3 rounded-full transition-all text-center flex items-center justify-center"
                  >
                    Previous
                  </button>
                )}

                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="ml-auto bg-gradient-to-r from-pool-blue to-pool-pink hover:from-pool-pink hover:to-pool-blue text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 transform hover:scale-105 transition-all shadow-lg hover:shadow-xl"
                  >
                    Next
                    <ChevronRight size={20} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="ml-auto bg-gradient-to-r from-pool-pink to-pool-purple hover:from-pool-purple hover:to-pool-pink text-white font-bold py-3 px-8 rounded-full transform hover:scale-105 transition-all shadow-lg hover:shadow-xl"
                  >
                    Submit Questionnaire
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}