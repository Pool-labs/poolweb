"use client"

import type React from "react"
import Link from "next/link"
import { useState } from "react"
import { MessageCircle, Send, CheckCircle, AlertCircle } from "lucide-react"
import BrandPattern from "@/components/brand/pattern"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  // "invalid" is the visitor's to fix; "failed" is ours. Telling someone to
  // re-check their fields when our email provider is down sends them round in
  // circles — that is what this page did while RESEND_API_KEY was missing.
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "invalid" | "failed">("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus("idle")

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setSubmitStatus("invalid")
      setIsSubmitting(false)
      return
    }

    try {

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.status === 400) {
        setSubmitStatus("invalid")
        return
      }
      if (!response.ok) {
        throw new Error(`Contact form returned ${response.status}`)
      }

      setSubmitStatus("success")
      setFormData({ name: "", email: "", message: "" })
    } catch (error) {
      console.error("Form submission error:", error)
      setSubmitStatus("failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen py-20 bg-tint-pink relative overflow-hidden">
      <BrandPattern variant="droplets" opacity={0.3} />
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-navy mb-6 text-center">
            {"Contact Us!"}
          </h1>

          <p className="text-lg sm:text-xl text-navy/80 text-center mb-12">
            {"We'd love to hear from you! Drop us a message and we'll splash back soon!"}
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Form */}
            <div className="sticker rounded-3xl bg-white p-6 sm:p-8">
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-navy mb-6 flex items-center gap-2">
                <MessageCircle className="text-pool-pink" />
                {"Send us a Message!"}
              </h2>

              {submitStatus === "success" && (
                <div className="mb-6 p-4 bg-pool-green/15 border-2 border-navy rounded-2xl flex items-center gap-2 text-navy font-medium">
                  <CheckCircle size={20} className="text-pool-green shrink-0" />
                  <span>Your message has been sent successfully. Thanks for reaching out!</span>
                </div>
              )}

              {submitStatus === "invalid" && (
                <div className="mb-6 p-4 bg-pool-pink/15 border-2 border-navy rounded-2xl flex items-center gap-2 text-navy font-medium">
                  <AlertCircle size={20} className="text-pool-pink shrink-0" />
                  <span>Please make sure all fields are filled out correctly.</span>
                </div>
              )}

              {submitStatus === "failed" && (
                <div className="mb-6 p-4 bg-pool-pink/15 border-2 border-navy rounded-2xl flex items-center gap-2 text-navy font-medium">
                  <AlertCircle size={20} className="text-pool-pink shrink-0" />
                  <span>
                    {"Something went wrong on our side and your message wasn't sent. Please email us at "}
                    <a href="mailto:support@poolapp.co" className="underline font-bold">
                      support@poolapp.co
                    </a>
                    {"."}
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-navy font-bold mb-2">{"Your Name"}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-full border-2 border-navy bg-white focus:border-pool-blue outline-none transition-colors"
                    placeholder="What should we call you?"
                    required
                  />
                </div>

                <div>
                  <label className="block text-navy font-bold mb-2">{"Your Email"}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-full border-2 border-navy bg-white focus:border-pool-blue outline-none transition-colors"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-navy font-bold mb-2">{"Your Message"}</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-navy bg-white focus:border-pool-blue outline-none transition-colors resize-none"
                    placeholder="Tell us what's on your mind!"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-sticker btn-pink w-full py-4 px-8 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-navy"></div>
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
              <div className="sticker rounded-3xl bg-sky-tint p-6 sm:p-8 md:rotate-1">
                <h3 className="font-display font-bold text-2xl text-navy mb-4">{"Quick Questions?"}</h3>
                <p className="text-lg text-navy/85 mb-6">
                  {
                    "Check out our FAQ section or reach out directly. We're always happy to help make your POOL experience amazing!"
                  }
                </p>
                <Link href="/faq" className="btn-sticker btn-blue inline-block">
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
