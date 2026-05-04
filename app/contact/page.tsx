"use client"

import type React from "react"
import Link from "next/link"
import { useState } from "react"
import { MessageCircle, Send, CheckCircle, AlertCircle } from "lucide-react"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus("idle")

    try {
      if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
        throw new Error("Please fill in all fields")
      }

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      setSubmitStatus("success")
      setFormData({ name: "", email: "", message: "" })
    } catch (error) {
      console.error("Form submission error:", error)
      setSubmitStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-5xl font-bold text-pool-navy mb-8 text-center text-shadow">
            {"Contact Us!"}
          </h1>

          <p className="text-xl text-pool-navy text-center mb-12 text-shadow">
            {"We'd love to hear from you! Drop us a message and we'll splash back soon!"}
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Form */}
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/30">
              <h2 className="text-3xl font-bold text-pool-navy mb-6 flex items-center gap-2 text-shadow">
                <MessageCircle className="text-pool-pink" />
                {"Send us a Message!"}
              </h2>

              {submitStatus === "success" && (
                <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-2xl flex items-center gap-2 text-green-800">
                  <CheckCircle size={20} />
                  <span>Your message has been sent successfully. Thanks for reaching out!</span>
                </div>
              )}

              {submitStatus === "error" && (
                <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-2xl flex items-center gap-2 text-red-800">
                  <AlertCircle size={20} />
                  <span>Please make sure all fields are filled out correctly.</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-pool-navy font-bold mb-2 text-shadow">{"Your Name"}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-full border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors"
                    placeholder="What should we call you?"
                    required
                  />
                </div>

                <div>
                  <label className="block text-pool-navy font-bold mb-2 text-shadow">{"Your Email"}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-full border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-pool-navy font-bold mb-2 text-shadow">{"Your Message"}</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-pool-blue focus:border-pool-pink outline-none transition-colors resize-none"
                    placeholder="Tell us what's on your mind!"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-pool-pink to-pool-purple hover:from-pool-purple hover:to-pool-pink text-white font-bold py-4 px-8 rounded-full text-lg transform hover:scale-105 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      {"Sending..."}
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      {"Send Message!"}
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-pool-green to-pool-blue rounded-3xl p-8 text-white shadow-xl">
                <h3 className="text-2xl font-bold mb-4 text-shadow">{"Quick Questions?"}</h3>
                <p className="text-lg mb-4 text-shadow">
                  {
                    "Check out our FAQ section or reach out directly. We're always happy to help make your POOL experience amazing!"
                  }
                </p>
                <Link
                  href="/faq"
                  className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-full transition-all text-shadow font-bold inline-block"
                >
                  {"View FAQ"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
