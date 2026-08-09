import { ReviewPanel } from "my-v0-project"

// The reviewer's decision form. An OPEN report pre-selects "Reviewing" — the
// form never pre-decides anything already moved.
const BASE = {
  id: "rep_7f21a9",
  targetType: "MESSAGE",
  targetId: "msg_44b1",
  reportedUserId: "usr_1c8e04",
  reporterUserId: "usr_9a3f21",
  reason: "HARASSMENT",
  status: "OPEN",
  action: "NONE",
  reviewerNotes: null,
  createdAt: "2026-03-02T18:41:09Z",
  reviewedAt: null,
  contentSnapshot: "you never pay me back, everyone in this pool knows it.",
}

export function OpenReport() {
  return (
    <div className="max-w-xl">
      <ReviewPanel report={BASE as never} onReviewed={() => {}} />
    </div>
  )
}

export function AlreadyActioned() {
  return (
    <div className="max-w-xl">
      <ReviewPanel
        report={{
          ...BASE,
          status: "ACTIONED",
          action: "USER_WARNED",
          reviewerNotes: "First offence — warned, kept in the pool.",
          reviewedAt: "2026-03-03T10:02:00Z",
        } as never}
        onReviewed={() => {}}
      />
    </div>
  )
}

export function UserTarget() {
  return (
    <div className="max-w-xl">
      <ReviewPanel
        report={{ ...BASE, targetType: "USER", targetId: "usr_1c8e04", contentSnapshot: null } as never}
        onReviewed={() => {}}
      />
    </div>
  )
}
