import { WarningAlert } from "my-v0-project"

// Amber, for "not an error, but don't walk away" outcomes — a 504 where the
// job may still be running being the canonical case.
export function TitleOnly() {
  return (
    <div className="max-w-lg">
      <WarningAlert title="Job still running" />
    </div>
  )
}

export function WithDetail() {
  return (
    <div className="max-w-lg">
      <WarningAlert title="Timed out waiting for the job (504)">
        <p>
          The request window closed before the job reported back. It may still be
          running — check status before triggering it again.
        </p>
      </WarningAlert>
    </div>
  )
}
