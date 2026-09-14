import { NextRequest, NextResponse } from "next/server"

import { getAdminFirestore } from "@/lib/server/firebaseAdmin"
import { invalidInput, readBoundedJson, resolveLocation, waitlistFailure } from "@/lib/waitlist/http"
import { questionnaireSchema } from "@/lib/waitlist/schema"
import { submitQuestionnaire } from "@/lib/waitlist/store"

export const runtime = "nodejs"

/**
 * POST /api/questionnaire — submit (or add to) questionnaire answers.
 *
 * Only the live questionnaire's fields are accepted (`questionnaireSchema`);
 * anything else in the body is dropped. The response is the same for a new
 * address, a known one, and one whose questionnaire is already complete: a
 * message and a one-time `siteVisitToken` for the follow-up question.
 */
export async function POST(request: NextRequest) {
  const body = await readBoundedJson(request)
  if (!body.ok) return body.response

  const parsed = questionnaireSchema.safeParse(body.value)
  if (!parsed.success) return invalidInput()

  try {
    const { siteVisitToken } = await submitQuestionnaire(
      getAdminFirestore(),
      { ...parsed.data, location: resolveLocation(request, parsed.data.clientLocation) },
      new Date(),
    )
    return NextResponse.json({ message: "Thanks, your answers are in.", siteVisitToken }, { status: 200 })
  } catch (error) {
    return waitlistFailure("questionnaire", error)
  }
}
