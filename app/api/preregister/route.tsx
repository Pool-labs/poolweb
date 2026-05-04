import { NextRequest, NextResponse } from "next/server"
import { addPreregisterUser } from "@/app/firebase/services"
import { getLocationFromVercelHeaders } from "@/lib/server-location"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { firstName, lastName, email, clientLocation } = data

    const serverLocation = getLocationFromVercelHeaders(request)
    const finalLocation = serverLocation || clientLocation || "Unknown"

    // Submit to Firebase with location
    const docId = await addPreregisterUser({
      firstName,
      lastName,
      email,
      location: finalLocation,
      submittedAt: new Date().toISOString()
    })

    return NextResponse.json(
      { 
        message: "Successfully preregistered!",
        docId 
      },
      { status: 200 }
    )
  } catch (error: any) {
    if (error.message === "USER_ALREADY_EXISTS") {
      return NextResponse.json(
        { 
          error: "This email is already registered.",
          code: "USER_ALREADY_EXISTS" 
        },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to preregister" },
      { status: 500 }
    )
  }
}
