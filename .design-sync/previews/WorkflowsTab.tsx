import { WorkflowsTab } from "my-v0-project"

// The QA console tabs are driven entirely by `status` — the GET /qa/status
// payload. Wire values below match the QaJobName / QaNotificationTemplate /
// QaWorkflowName enums in lib/admin/types.ts.
const STATUS = {
  enabled: true,
  environment: "staging",
  jobs: ["purge_analytics", "purge_audit"],
  notificationTemplates: ["pool_invite", "friend_request", "friend_accepted", "expense_logged"],
  workflows: ["pool_invite", "friend_request", "log_expense", "settlement", "close_pool"],
  limits: { maxSelectedUsers: 25, maxBroadcastRecipients: 200, maxSyntheticUsers: 25 },
}

export function Default() {
  return (
    <div className="max-w-3xl">
      <WorkflowsTab status={STATUS as never} />
    </div>
  )
}
