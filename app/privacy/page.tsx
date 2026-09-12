import type { Metadata } from "next"

import { LegalDoc } from "@/components/legal-doc"
import { PRIVACY_POLICY_HTML } from "@/lib/legal/privacy-policy.generated"

export const metadata: Metadata = {
  title: "Privacy Policy — Pool",
  description: "What Pool collects, why, and the choices you have.",
}

// Replaced the pre-2026 hand-written policy (which described Pool as charging
// cards and issuing virtual cards — claims the shipped product denies) with the
// official policy generated from poolmobile docs/legal/PRIVACY-POLICY.md (#595).
// The mobile app's "Privacy Policy" link opens this route
// (apps/mobile/src/utils/legalLinks.ts) — do not move it without updating that.
export default function PrivacyPolicyPage() {
  return <LegalDoc html={PRIVACY_POLICY_HTML} />
}
