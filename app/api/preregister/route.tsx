import { NextRequest, NextResponse } from "next/server"

import { getAdminFirestore } from "@/lib/server/firebaseAdmin"
import { invalidInput, readBoundedJson, resolveLocation, waitlistFailure } from "@/lib/waitlist/http"
import { preregisterSchema } from "@/lib/waitlist/schema"
import { preregister } from "@/lib/waitlist/store"

export const runtime = "nodejs"

/**
 * POST /api/preregister — join the waitlist.
 *
 * Idempotent, and it answers the SAME way whether the address is new or
 * already on the list, so this endpoint cannot be used to check whether
 * someone signed up. Firestore access is server-side via the Admin SDK only.
 */
export async function POST(request: NextRequest) {
  const body = await readBoundedJson(request)
  if (!body.ok) return body.response

  const parsed = preregisterSchema.safeParse(body.value)
  if (!parsed.success) return invalidInput()

  try {
    await preregister(
      getAdminFirestore(),
      { ...parsed.data, location: resolveLocation(request, parsed.data.clientLocation) },
      new Date(),
    )
    return NextResponse.json({ message: "You're on the list!" }, { status: 200 })
  } catch (error) {
    return waitlistFailure("preregister", error)
  }
}
