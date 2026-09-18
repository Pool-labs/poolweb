import type { Metadata } from "next"

import { LegalDoc } from "@/components/legal-doc"
import { CHILD_SAFETY_STANDARDS_HTML } from "@/lib/legal/child-safety-standards.generated"

export const metadata: Metadata = {
  title: "Child Safety Standards — Pool",
  description:
    "Pool's published standards against child sexual abuse and exploitation, and how to report a concern.",
}

// Required by Google Play's Child Safety Standards policy, which every app in
// the Social category must satisfy before it can ship an update. The Play
// Console declaration (App content -> Child safety standards) points at
// https://poolapp.co/child-safety.
//
// ⚠️ DO NOT MOVE OR RENAME THIS ROUTE. Google re-checks the URL it was given,
// and a 404 here is a policy failure on the one declaration whose compliance
// deadline has already passed. Generated from poolmobile
// docs/legal/CHILD-SAFETY-STANDARDS.md, which is the source of truth.
export default function ChildSafetyStandardsPage() {
  return <LegalDoc html={CHILD_SAFETY_STANDARDS_HTML} />
}
