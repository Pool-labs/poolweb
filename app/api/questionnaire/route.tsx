import { NextRequest, NextResponse } from "next/server"
import { submitSurvey } from "@/app/firebase/services"
import { getLocationFromVercelHeaders } from "@/lib/server-location"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const { firstName, lastName, email, clientLocation, hasVisitedSite, ...surveyData } = data

    const serverLocation = getLocationFromVercelHeaders(request)
    const finalLocation = serverLocation || clientLocation || "Unknown"

    // Submit to Firebase with location and hasVisitedSite
    const result = await submitSurvey(firstName, lastName, email, surveyData, finalLocation, hasVisitedSite)

    // Get the updated user data to return in response
    const { getPreregisterUserByEmail } = await import("@/app/firebase/services")
    const updatedUser = await getPreregisterUserByEmail(email)

    return NextResponse.json(
      { 
        message: result.isUpdate ? "Survey updated successfully" : "Survey submitted successfully",
        docId: result.id,
        isUpdate: result.isUpdate,
        hasVisitedSite: updatedUser?.hasVisitedSite
      },
      { status: 200 }
    )
  } catch (error: any) {
    if (error.message === "SURVEY_ALREADY_COMPLETED") {
      return NextResponse.json(
        { 
          error: "Survey already completed",
          code: "SURVEY_ALREADY_COMPLETED" 
        },
        { status: 409 } // Conflict status
      )
    }
    
    return NextResponse.json(
      { error: "Failed to submit survey" },
      { status: 500 }
    )
  }
}
