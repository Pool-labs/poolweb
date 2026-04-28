"use client"

import { detectClientLocation } from "@/lib/location-utils"
import { AlertCircle, CheckSquare, ChevronRight, Gift, Globe, Square } from "lucide-react"
import { useRouter } from "next/navigation"
import type React from "react"
import { useEffect, useState } from "react"

type FormData = {
  hangoutFrequency: string
  avgSpend: string
  splitWith: string
  splitWithOther: string
  splitTypes: string[]
  splitTypesOther: string
  poolWithAcquaintance: string
  poolWithStranger: string
  dailyRoutinePooling: string
  discoveryInterest: string
  openPoolTypes: string[]
  openPoolTypesOther: string
  trustRequirements: string
  valuableFeatures: string[]
  concerns: string
  firstName: string
  lastName: string
  email: string
}

const initialFormData: FormData = {
  hangoutFrequency: "",
  avgSpend: "",
  splitWith: "",
  splitWithOther: "",
  splitTypes: [],
  splitTypesOther: "",
  poolWithAcquaintance: "",
  poolWithStranger: "",
  dailyRoutinePooling: "",
  discoveryInterest: "",
  openPoolTypes: [],
  openPoolTypesOther: "",
  trustRequirements: "",
  valuableFeatures: [],
  concerns: "",
  firstName: "",
  lastName: "",
  email: "",
}

const STORAGE_KEY = "survey_progress"

// Helper function to check if form data is complete
function checkIfFormDataComplete(data: FormData): boolean {
  const requiredFields = [
    'hangoutFrequency',
    'avgSpend',
    'splitWith',
    'splitTypes',
    'poolWithAcquaintance',
    'poolWithStranger',
    'dailyRoutinePooling',
    'discoveryInterest',
    'openPoolTypes',
    'trustRequirements',
    'valuableFeatures',
    'concerns'
  ];

  for (const field of requiredFields) {
    const value = data[field as keyof FormData];
    if (!value || (Array.isArray(value) && value.length === 0)) {
      // Check for "Other" fields that might need to be filled
      if (field === 'splitWith' && value === 'Other' && !data.splitWithOther) {
        return false;
      }
      if (field === 'splitTypes' && Array.isArray(value) && value.includes('Other') && !data.splitTypesOther) {
        return false;
      }
      if (field === 'openPoolTypes' && Array.isArray(value) && value.includes('Other') && !data.openPoolTypesOther) {
        return false;
      }
      return false;
    }
  }

  return true;
}

export default function SurveyPage() {
  const router = useRouter()
  // Initialize form data from localStorage if available
  const [formData, setFormData] = useState<FormData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedProgress = localStorage.getItem(STORAGE_KEY)
        if (savedProgress) {
          const parsedData = JSON.parse(savedProgress)
          // Check if this is a complete survey
          const isComplete = checkIfFormDataComplete(parsedData)
          if (isComplete) {
            // If survey was already 100% complete, clear it from storage
            localStorage.removeItem(STORAGE_KEY)
            return initialFormData
          }
          // Merge with initialFormData so any newly-introduced fields exist
          return { ...initialFormData, ...parsedData }
        }
      } catch (error) {
        // Error loading initial progress
      }
    }
    return initialFormData
  })

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

  const totalSteps = 5
  const totalQuestions = 12

  // Handle navigation and visibility changes
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true)
      return
    }

    const loadSavedProgress = () => {
      try {
        // Loading saved progress
        const savedProgress = localStorage.getItem(STORAGE_KEY)
        if (savedProgress) {
          // Found saved progress
          const parsedProgress = JSON.parse(savedProgress)
          // Only update if there's actual data
          if (Object.values(parsedProgress).some(value =>
            value !== "" &&
            (Array.isArray(value) ? value.length > 0 : true)
          )) {
            setFormData({ ...initialFormData, ...parsedProgress })
            // Progress loaded successfully
          } else {
            // Saved progress was empty, keeping current state
          }
        } else {
          // No saved progress found
        }
      } catch (error) {
        // Error loading saved progress
        localStorage.removeItem(STORAGE_KEY)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible, reloading progress
        loadSavedProgress()
      }
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        // Storage changed, reloading progress
        loadSavedProgress()
      }
    }

    const handleRouteChange = () => {
      // Route changed, reloading progress
      loadSavedProgress()
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('focus', loadSavedProgress)
    window.addEventListener('pageshow', loadSavedProgress)
    window.addEventListener('popstate', handleRouteChange)
    // Cleanup event listeners
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', loadSavedProgress)
      window.removeEventListener('pageshow', loadSavedProgress)
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [isInitialized])

  // Save progress whenever form data changes
  useEffect(() => {
    try {
      // Saving progress
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
    } catch (error) {
      // Error saving progress
    }
  }, [formData])

  // Calculate questions answered whenever form data changes
  useEffect(() => {
    let answered = 0;

    // Q1: Hangout frequency
    if (formData.hangoutFrequency) answered++

    // Q2: Average spend
    if (formData.avgSpend && !isNaN(Number(formData.avgSpend))) answered++

    // Q3: Split with whom
    if (formData.splitWith) {
      if (formData.splitWith !== "Other") {
        answered++
      } else if (formData.splitWithOther.trim()) {
        answered++
      }
    }

    // Q4: Split types (checkbox)
    if (formData.splitTypes.length > 0) {
      if (!formData.splitTypes.includes("Other")) {
        answered++
      } else if (formData.splitTypesOther.trim()) {
        answered++
      }
    }

    // Q5: Pool with acquaintance
    if (formData.poolWithAcquaintance) answered++

    // Q6: Pool with stranger sharing the same plan
    if (formData.poolWithStranger) answered++

    // Q7: Daily routine pooling
    if (formData.dailyRoutinePooling) answered++

    // Q8: Discovery interest
    if (formData.discoveryInterest) answered++

    // Q9: Open pool types (checkbox)
    if (formData.openPoolTypes.length > 0) {
      if (!formData.openPoolTypes.includes("Other")) {
        answered++
      } else if (formData.openPoolTypesOther.trim()) {
        answered++
      }
    }

    // Q10: Trust requirements
    if (formData.trustRequirements.trim()) answered++

    // Q11: Valuable features
    if (formData.valuableFeatures.length > 0) answered++

    // Q12: Concerns
    if (formData.concerns.trim()) answered++

    setQuestionsAnswered(answered)
  }, [formData])

  const handleInputChange = (field: keyof FormData, value: string | string[]) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleCheckboxChange = (field: "splitTypes" | "valuableFeatures" | "openPoolTypes", value: string) => {
    const currentValues = formData[field] as string[]
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value]
    handleInputChange(field, newValues)
  }

  const isAllQuestionsAnswered = (): boolean => {
    return (
      formData.hangoutFrequency !== "" &&
      formData.avgSpend !== "" &&
      formData.splitWith !== "" &&
      (formData.splitWith !== "Other" || formData.splitWithOther !== "") &&
      formData.splitTypes.length > 0 &&
      (!formData.splitTypes.includes("Other") || formData.splitTypesOther !== "") &&
      formData.poolWithAcquaintance !== "" &&
      formData.poolWithStranger !== "" &&
      formData.dailyRoutinePooling !== "" &&
      formData.discoveryInterest !== "" &&
      formData.openPoolTypes.length > 0 &&
      (!formData.openPoolTypes.includes("Other") || formData.openPoolTypesOther !== "") &&
      formData.trustRequirements !== "" &&
      formData.valuableFeatures.length > 0 &&
      formData.concerns !== ""
    )
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
      case 1: return Boolean(formData.hangoutFrequency)
      case 2: return Boolean(formData.avgSpend && !isNaN(Number(formData.avgSpend)))
      case 3: return Boolean(formData.splitWith && (formData.splitWith !== "Other" || formData.splitWithOther.trim()))
      case 4: return Boolean(formData.splitTypes.length > 0 && (!formData.splitTypes.includes("Other") || formData.splitTypesOther.trim()))
      case 5: return Boolean(formData.poolWithAcquaintance)
      case 6: return Boolean(formData.poolWithStranger)
      case 7: return Boolean(formData.dailyRoutinePooling)
      case 8: return Boolean(formData.discoveryInterest)
      case 9: return Boolean(formData.openPoolTypes.length > 0 && (!formData.openPoolTypes.includes("Other") || formData.openPoolTypesOther.trim()))
      case 10: return Boolean(formData.trustRequirements.trim())
      case 11: return Boolean(formData.valuableFeatures.length > 0)
      case 12: return Boolean(formData.concerns.trim())
      default: return false
    }
  }

  const getQuestionStep = (questionNumber: number): number => {
    if (questionNumber <= 3) return 1
    if (questionNumber <= 5) return 2
    if (questionNumber <= 7) return 3
    if (questionNumber <= 10) return 4
    return 5
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

    // Proceed with submission - we'll check hasVisitedSite in Firebase after submission
    await submitForm()
  }

  const handleSiteVisitUpdate = async (visited: boolean) => {
    try {
      // Update hasVisitedSite in Firebase
      const response = await fetch("/api/update-site-visit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail || formData.email,
          hasVisitedSite: visited
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

      console.log("Survey submission response:", result)
      console.log("hasVisitedSite from response:", result.hasVisitedSite)

      // Clear saved progress if survey is now 100% complete
      if (isAllQuestionsAnswered()) {
        // All questions answered, clearing saved progress
        localStorage.removeItem(STORAGE_KEY)
      }

      // Check if we need to show the hasVisitedSite popup based on the response
      if (result.hasVisitedSite === null || result.hasVisitedSite === undefined) {
        // Show the popup instead of navigating immediately
        console.log("Showing site visit modal because hasVisitedSite is null/undefined")
        setShowSiteVisitModal(true)
        setIsSubmitting(false)
        return
      }

      // Navigate to confirmation page if hasVisitedSite is already set
      const params = new URLSearchParams({
        complete: String(!isPartialSubmission),
        updated: String(result.isUpdate || false),
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        email: formData.email || ''
      })
      router.push(`/questionnaire/confirmation?${params}`)
    } catch (error) {
      console.error("Survey submission error:", error)
      alert("An error occurred while submitting the survey. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showDuplicateMessage) {
    return (
      <div className="min-h-screen py-20">
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

        <div className="min-h-screen py-20">
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
                          Finish the remaining questions to unlock VIP access to our exclusive merch drop and claim a free item of your choice.
                        </p>
                        <p className="text-yellow-800 text-center mt-2">
                          {questionsAnswered} of {totalQuestions} questions answered
                        </p>
                      </div>
                      <div className="mb-8">
                        <p className="text-lg text-pool-navy mb-4 text-center text-shadow">
                          Thank you for taking the time to share your feedback!
                        </p>
                        <p className="text-sm text-pool-navy/80 mb-4 text-center">
                          You can still submit your responses now, or go back to complete all questions and unlock VIP access to our exclusive merch drop.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="mb-8">
                      <p className="text-lg text-pool-navy mb-4 text-center text-shadow">
                        Just need your contact info to secure your VIP access to our exclusive merch collection!
                      </p>
                      <p className="text-sm text-pool-navy/80 text-center">
                        You've completed all questions and unlocked VIP access to our exclusive merch drop!
                      </p>
                    </div>
                  )}
                </div>

                <form onSubmit={handleFinalSubmit} className="space-y-6">
                  <div>
                    <label className="block text-pool-navy font-bold mb-2 text-shadow">First Name</label>
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
                    <label className="block text-pool-navy font-bold mb-2 text-shadow">Last Name</label>
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
                    <label className="block text-pool-navy font-bold mb-2 text-shadow">Email</label>
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

  const comfortScale = ["Definitely", "Probably", "Maybe", "Probably not", "Definitely not"]

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                How often do you hang out with friends?
              </label>
              <div className="space-y-3">
                {["Daily", "A few times a week", "Once a week", "A few times a month", "Rarely"].map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-4 bg-white/30 rounded-2xl border-2 border-transparent hover:border-pool-blue cursor-pointer transition-all"
                  >
                    <input
                      type="radio"
                      name="hangoutFrequency"
                      value={option}
                      checked={formData.hangoutFrequency === option}
                      onChange={(e) => handleInputChange("hangoutFrequency", e.target.value)}
                      className="mr-3 w-5 h-5 text-pool-pink focus:ring-pool-pink"
                    />
                    <span className="text-pool-navy font-medium">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                On average, how much do you spend when you hang out?
              </label>
              <input
                type="number"
                value={formData.avgSpend}
                onChange={(e) => handleInputChange("avgSpend", e.target.value)}
                className="w-full px-4 py-3 rounded-full border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors"
                placeholder="Enter amount in dollars"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                When you split expenses, who's it usually with?
              </label>
              <div className="space-y-3">
                {["Friends", "Family", "Coworkers", "Acquaintances / people I don't know well", "Other"].map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-4 bg-white/30 rounded-2xl border-2 border-transparent hover:border-pool-blue cursor-pointer transition-all"
                  >
                    <input
                      type="radio"
                      name="splitWith"
                      value={option}
                      checked={formData.splitWith === option}
                      onChange={(e) => handleInputChange("splitWith", e.target.value)}
                      className="mr-3 w-5 h-5 text-pool-pink focus:ring-pool-pink"
                    />
                    <span className="text-pool-navy font-medium">{option}</span>
                  </label>
                ))}
              </div>
              {formData.splitWith === "Other" && (
                <input
                  type="text"
                  value={formData.splitWithOther}
                  onChange={(e) => handleInputChange("splitWithOther", e.target.value)}
                  className="w-full mt-3 px-4 py-3 rounded-full border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors"
                  placeholder="Please specify..."
                />
              )}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-8">
            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                What kinds of things do you usually split? (check all that apply)
              </label>
              <div className="space-y-3">
                {[
                  "Food & drinks",
                  "Rent/bills",
                  "Entertainment (movies, concerts, games, etc.)",
                  "Vacations/trips",
                  "Other",
                ].map((option) => (
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
                  className="w-full mt-3 px-4 py-3 rounded-full border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors"
                  placeholder="Please specify..."
                />
              )}
            </div>

            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                Imagine someone you know but isn't a close friend wants to go on the same trip or event as you. Would you pool money with them to make it happen?
              </label>
              <div className="space-y-3">
                {comfortScale.map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-4 bg-white/30 rounded-2xl border-2 border-transparent hover:border-pool-blue cursor-pointer transition-all"
                  >
                    <input
                      type="radio"
                      name="poolWithAcquaintance"
                      value={option}
                      checked={formData.poolWithAcquaintance === option}
                      onChange={(e) => handleInputChange("poolWithAcquaintance", e.target.value)}
                      className="mr-3 w-5 h-5 text-pool-pink focus:ring-pool-pink"
                    />
                    <span className="text-pool-navy font-medium">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-8">
            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                Now imagine someone you don't know — a stranger on POOL — has the exact same trip, concert, or goal in mind as you. Would you pool with them to share the cost?
              </label>
              <div className="space-y-3">
                {comfortScale.map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-4 bg-white/30 rounded-2xl border-2 border-transparent hover:border-pool-blue cursor-pointer transition-all"
                  >
                    <input
                      type="radio"
                      name="poolWithStranger"
                      value={option}
                      checked={formData.poolWithStranger === option}
                      onChange={(e) => handleInputChange("poolWithStranger", e.target.value)}
                      className="mr-3 w-5 h-5 text-pool-pink focus:ring-pool-pink"
                    />
                    <span className="text-pool-navy font-medium">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                Would you be open to pooling on everyday spending — coffee runs, lunch, gym, rideshare — with people on a similar daily routine?
              </label>
              <div className="space-y-3">
                {comfortScale.map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-4 bg-white/30 rounded-2xl border-2 border-transparent hover:border-pool-blue cursor-pointer transition-all"
                  >
                    <input
                      type="radio"
                      name="dailyRoutinePooling"
                      value={option}
                      checked={formData.dailyRoutinePooling === option}
                      onChange={(e) => handleInputChange("dailyRoutinePooling", e.target.value)}
                      className="mr-3 w-5 h-5 text-pool-pink focus:ring-pool-pink"
                    />
                    <span className="text-pool-navy font-medium">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-8">
            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                Would you want POOL to surface people with similar trip plans, budgets, or interests so you could pool with them?
              </label>
              <div className="space-y-3">
                {comfortScale.map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-4 bg-white/30 rounded-2xl border-2 border-transparent hover:border-pool-blue cursor-pointer transition-all"
                  >
                    <input
                      type="radio"
                      name="discoveryInterest"
                      value={option}
                      checked={formData.discoveryInterest === option}
                      onChange={(e) => handleInputChange("discoveryInterest", e.target.value)}
                      className="mr-3 w-5 h-5 text-pool-pink focus:ring-pool-pink"
                    />
                    <span className="text-pool-navy font-medium">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                Which kinds of pools would you be open to joining with people who aren't close friends? (check all that apply)
              </label>
              <div className="space-y-3">
                {[
                  "Trips / vacations",
                  "Concerts / events",
                  "Daily routines (coffee, lunch, gym, rideshare)",
                  "Group purchases (gifts, equipment)",
                  "Subscriptions (streaming, gym, software)",
                  "None of the above",
                  "Other",
                ].map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-4 bg-white/30 rounded-2xl border-2 border-transparent hover:border-pool-blue cursor-pointer transition-all"
                  >
                    <div className="mr-3">
                      {formData.openPoolTypes.includes(option) ? (
                        <CheckSquare className="w-5 h-5 text-pool-pink" />
                      ) : (
                        <Square className="w-5 h-5 text-pool-navy" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      value={option}
                      checked={formData.openPoolTypes.includes(option)}
                      onChange={() => handleCheckboxChange("openPoolTypes", option)}
                      className="sr-only"
                    />
                    <span className="text-pool-navy font-medium">{option}</span>
                  </label>
                ))}
              </div>
              {formData.openPoolTypes.includes("Other") && (
                <input
                  type="text"
                  value={formData.openPoolTypesOther}
                  onChange={(e) => handleInputChange("openPoolTypesOther", e.target.value)}
                  className="w-full mt-3 px-4 py-3 rounded-full border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors"
                  placeholder="Please specify..."
                />
              )}
            </div>

            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                What would make you trust pooling money with someone you don't already know well?
              </label>
              <textarea
                value={formData.trustRequirements}
                onChange={(e) => handleInputChange("trustRequirements", e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors resize-none"
                placeholder="e.g., verified profiles, mutual friends, ratings, escrow..."
              />
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-8">
            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                Which of these features would be most valuable to you? (check all that apply)
              </label>
              <div className="space-y-3">
                {[
                  "Match with people who have similar trips or interests",
                  "Profile / reputation system to build trust",
                  "In-app chat with potential pool partners",
                  "Auto-tracking shared expenses",
                  "Instant pay / settle up",
                  "Virtual cards for each pool member",
                  "Reminders",
                  "None of the above",
                ].map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-4 bg-white/30 rounded-2xl border-2 border-transparent hover:border-pool-blue cursor-pointer transition-all"
                  >
                    <div className="mr-3">
                      {formData.valuableFeatures.includes(option) ? (
                        <CheckSquare className="w-5 h-5 text-pool-pink" />
                      ) : (
                        <Square className="w-5 h-5 text-pool-navy" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      value={option}
                      checked={formData.valuableFeatures.includes(option)}
                      onChange={() => handleCheckboxChange("valuableFeatures", option)}
                      className="sr-only"
                    />
                    <span className="text-pool-navy font-medium">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-pool-navy font-bold mb-4 text-shadow text-lg">
                If POOL existed today, what would your biggest concerns be?
              </label>
              <textarea
                value={formData.concerns}
                onChange={(e) => handleInputChange("concerns", e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors resize-none"
                placeholder="Share your concerns..."
              />
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

      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold text-pool-navy mb-8 text-center text-shadow">
              Questionnaire
            </h1>

            {/* VIP access banner */}
            <div className="bg-gradient-to-r from-pool-pink to-pool-purple rounded-3xl p-6 mb-8 text-white shadow-xl">
              <div className="flex items-center justify-center space-x-3">
                <p className="text-lg font-bold text-center text-shadow">
                  Your input matters. Share your thoughts and we’ll hook you up with first access to our exclusive merch collection! Plus, you’ll get to pick a free item of your choice!
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