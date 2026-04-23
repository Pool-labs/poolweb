"use client"

import type React from "react"
import { useState } from "react"
import { Sparkles, CheckCircle, AlertCircle } from "lucide-react"
import { detectClientLocation } from "@/lib/location-utils"

interface FormData {
  firstName: string
  lastName: string
  email: string
}

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
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

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required"
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitStatus("idle")

    try {
      // Use the API endpoint which handles location detection
      const response = await fetch('/api/preregister', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          clientLocation: detectClientLocation()
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        if (data.code === "USER_ALREADY_EXISTS") {
          throw new Error("USER_ALREADY_EXISTS")
        }
        throw new Error(data.error || "Failed to preregister")
      }

      setSubmitStatus("success")
      // Clear form after successful submission
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
      })
    } catch (error: any) {
      if (error.message === "USER_ALREADY_EXISTS") {
        setSubmitStatus("duplicate")
      } else {
        setSubmitStatus("error")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-pool-navy mb-4 text-shadow">
              Preregister for Pool
            </h1>
            <p className="text-xl text-pool-navy/80 text-shadow">
              Be the first to know when our mobile app launches!
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/30">
            {/* Success Message */}
            {submitStatus === "success" && (
              <div className="bg-gradient-to-r from-pool-pink/20 to-pool-yellow/20 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border-2 border-white/40 mb-8 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-pool-yellow/10 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-pool-pink/10 rounded-full blur-2xl" />
                
                <div className="relative z-10 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="bg-gradient-to-r from-pool-green to-pool-blue p-4 rounded-full">
                      <CheckCircle className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-pool-navy mb-4 text-shadow">
                    You're on the VIP List!
                  </h3>
                  <p className="text-xl font-semibold text-pool-navy mb-2 text-shadow">
                    Get ready for exclusive early access to POOL.
                  </p>
                  <p className="text-lg text-pool-navy/80">
                    We'll notify you first when our mobile app launches!
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {submitStatus === "error" && (
              <div className="mb-8 p-6 bg-red-100 border-2 border-red-300 rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-lg font-bold text-red-800">
                    Something went wrong. Please try again.
                  </p>
                  <p className="text-red-700 mt-1">
                    If the problem persists, please contact support.
                  </p>
                </div>
              </div>
            )}

            {/* Duplicate Message */}
            {submitStatus === "duplicate" && (
              <div className="mb-8 p-6 bg-yellow-100 border-2 border-yellow-400 rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
                <div>
                  <p className="text-lg font-bold text-yellow-800">
                    You have already preregistered.
                  </p>
                  <p className="text-yellow-700 mt-1">
                    We'll notify you as soon as the mobile app is available!
                  </p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* First Name */}
              <div>
                <label className="block text-pool-navy font-bold mb-2 text-shadow">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  className={`w-full px-4 py-3 rounded-full border-2 ${
                    errors.firstName
                      ? "border-red-400 focus:border-red-500"
                      : "border-pool-blue focus:border-pool-pink"
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
                <label className="block text-pool-navy font-bold mb-2 text-shadow">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  className={`w-full px-4 py-3 rounded-full border-2 ${
                    errors.lastName
                      ? "border-red-400 focus:border-red-500"
                      : "border-pool-blue focus:border-pool-pink"
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
                <label className="block text-pool-navy font-bold mb-2 text-shadow">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`w-full px-4 py-3 rounded-full border-2 ${
                    errors.email
                      ? "border-red-400 focus:border-red-500"
                      : "border-pool-blue focus:border-pool-pink"
                  } outline-none transition-colors`}
                  placeholder="your@email.com"
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-2 ml-4">{errors.email}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-pool-pink to-pool-purple hover:from-pool-purple hover:to-pool-pink text-white font-bold py-4 px-8 rounded-full text-lg transform hover:scale-105 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Preregister
                  </>
                )}
              </button>
            </form>

            {/* Additional Info */}
            <div className="mt-8 p-6 bg-gradient-to-br from-pool-blue/10 to-pool-pink/10 rounded-2xl">
              <p className="text-pool-navy text-center text-sm">
                By preregistering, you'll be among the first to experience Pool—the social network
                for the things you actually do together. We'll send you exclusive early access!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
