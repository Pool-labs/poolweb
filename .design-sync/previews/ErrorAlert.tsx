import { ErrorAlert } from "my-v0-project"

// Renders nothing when `message` is null — that is how callers clear it.
export function WithMessage() {
  return (
    <div className="max-w-lg">
      <ErrorAlert message="Broadcast refused: over the recipient cap (409)." />
    </div>
  )
}

export function LongMessage() {
  return (
    <div className="max-w-lg">
      <ErrorAlert message="The scheduled job did not return within the request window (504). It may still be running — re-run the status check before triggering it again." />
    </div>
  )
}
