import type { Metadata } from "next"

import { LegalDoc } from "@/components/legal-doc"
import { TERMS_OF_SERVICE_HTML } from "@/lib/legal/terms-of-service.generated"

export const metadata: Metadata = {
  title: "Terms of Service — Pool",
  description: "The terms governing your use of the Pool app and poolapp.co.",
}

// The mobile app's "Terms of Service" link opens this route
// (apps/mobile/src/utils/legalLinks.ts) — do not move it without updating that.
export default function TermsOfServicePage() {
  return <LegalDoc html={TERMS_OF_SERVICE_HTML} />
}
