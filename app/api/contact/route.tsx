import { Resend } from "resend"
import { type NextRequest, NextResponse } from "next/server"

/**
 * The website contact form → Pool support.
 *
 * ⚠️ THE API KEY WAS HARDCODED IN THIS FILE, IN A PUBLIC REPO, since the
 * initial fork commit. It now comes from `RESEND_API_KEY` and the old one must
 * be revoked in the Resend dashboard — rotating is the fix, moving it is only
 * half of one. There is no fallback literal on purpose: a missing key should
 * fail loudly at send time, never silently reintroduce a committed secret.
 *
 * ⚠️ AND EVERY FIELD WAS INTERPOLATED RAW INTO HTML. `name`, `email` and
 * `message` are typed by anybody on the internet, so the form was a way to put
 * arbitrary markup into an inbox we read. They are escaped now, and the subject
 * has its newlines stripped.
 *
 * Goes to SUPPORT, not admin (#394): support is the address a person writing to
 * Pool should reach, and it is where the in-app support channel already lands,
 * so one mailbox holds both halves of the conversation.
 */

/** Where a person writing to Pool actually lands. */
const SUPPORT_INBOX = "support@poolapp.co"

/**
 * ⚠️ `onboarding@resend.dev` is Resend's SANDBOX sender, not a Pool address —
 * mail from it is far likelier to be filtered. Override with a sender on a
 * domain verified in Resend once that is set up; the sandbox default is kept
 * only so the form does not break before then.
 */
const FROM_ADDRESS = process.env.CONTACT_FROM_EMAIL ?? "Pool Contact Form <onboarding@resend.dev>"

/** Generous, but bounded — an unbounded field is a way to post a novel to us. */
const MAX_LENGTH = { name: 120, email: 254, message: 5000 } as const

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

/** Shape only — proving an address receives mail is what a reply is for. */
const looksLikeEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error("Contact form: RESEND_API_KEY is not set")
      return NextResponse.json({ error: "Contact form is not configured" }, { status: 500 })
    }

    const body = await request.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const email = typeof body.email === "string" ? body.email.trim() : ""
    const message = typeof body.message === "string" ? body.message.trim() : ""

    if (!name || !email || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }
    if (!looksLikeEmail(email)) {
      return NextResponse.json({ error: "That doesn't look like an email address" }, { status: 400 })
    }
    if (
      name.length > MAX_LENGTH.name ||
      email.length > MAX_LENGTH.email ||
      message.length > MAX_LENGTH.message
    ) {
      return NextResponse.json({ error: "That message is too long" }, { status: 400 })
    }

    const safe = {
      name: escapeHtml(name),
      email: escapeHtml(email),
      message: escapeHtml(message).replace(/\n/g, "<br>"),
    }
    // A newline in a subject is a header-injection shape; strip it even though
    // Resend takes JSON rather than raw SMTP.
    const subject = `New Contact Form Message from ${name.replace(/[\r\n]+/g, " ")}`

    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [SUPPORT_INBOX],
      // So a reply goes to the person who wrote in, not into the void.
      replyTo: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>

          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${safe.name}</p>
            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${safe.email}</p>
          </div>

          <div style="margin: 20px 0;">
            <h3 style="color: #333; margin-bottom: 10px;">Message:</h3>
            <div style="background-color: #fff; padding: 15px; border-left: 4px solid #007bff; border-radius: 4px;">
              ${safe.message}
            </div>
          </div>

          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            This message was sent from the Pool website contact form.
          </p>
        </div>
      `,
      text: `New Contact Form Submission

Name: ${name}
Email: ${email}

Message:
${message}

---
This message was sent from the Pool website contact form.`,
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }

    return NextResponse.json({ message: "Email sent successfully", id: data?.id }, { status: 200 })
  } catch (error) {
    console.error("Contact form error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
