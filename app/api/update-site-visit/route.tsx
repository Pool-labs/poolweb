import { NextRequest, NextResponse } from "next/server"

import { getAdminFirestore } from "@/lib/server/firebaseAdmin"
import { invalidInput, readBoundedJson, waitlistFailure } from "@/lib/waitlist/http"
import { siteVisitSchema } from "@/lib/waitlist/schema"
import { recordSiteVisit } from "@/lib/waitlist/store"

export const runtime = "nodejs"

/**
 * POST /api/update-site-visit — answer the questionnaire's follow-up question.
 *
 * Takes effect only with the one-time token the questionnaire response issued
 * (see `recordSiteVisit`). It answers the same way whether or not anything was
 * recorded, so it reveals nothing about which addresses are on the list.
 */
export async function POST(request: NextRequest) {
  const body = await readBoundedJson(request)
  if (!body.ok) return body.response

  const parsed = siteVisitSchema.safeParse(body.value)
  if (!parsed.success) return invalidInput()

  try {
    await recordSiteVisit(getAdminFirestore(), parsed.data, new Date())
    return NextResponse.json({ message: "Thanks!" }, { status: 200 })
  } catch (error) {
    return waitlistFailure("update-site-visit", error)
  }
}
