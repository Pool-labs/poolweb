import { Alert, AlertDescription, AlertTitle } from "my-v0-project"

export function Default() {
  return (
    <Alert className="max-w-lg">
      <AlertTitle>Reseed queued</AlertTitle>
      <AlertDescription>
        Staging data is being rebuilt. This usually takes about a minute.
      </AlertDescription>
    </Alert>
  )
}

export function Destructive() {
  return (
    <Alert variant="destructive" className="max-w-lg">
      <AlertTitle>force-pool-status bypassed the state machine</AlertTitle>
      <AlertDescription>
        The pool was written directly. Balances and ledger entries were not
        recomputed — verify before relying on them.
      </AlertDescription>
    </Alert>
  )
}

export function TitleOnly() {
  return (
    <Alert className="max-w-lg">
      <AlertTitle>No devices registered for this user.</AlertTitle>
    </Alert>
  )
}
