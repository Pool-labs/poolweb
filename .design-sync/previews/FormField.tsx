import { FormField, Input, Textarea } from "my-v0-project"

// The QA console's label + control + hint stack. `htmlFor` ties the label to
// the control it wraps.
export function WithInput() {
  return (
    <div className="max-w-sm">
      <FormField label="Push title" htmlFor="push-title" hint="Max 60 characters.">
        <Input id="push-title" defaultValue="Your crew just pooled in" />
      </FormField>
    </div>
  )
}

export function WithTextarea() {
  return (
    <div className="max-w-sm">
      <FormField
        label="Push body"
        htmlFor="push-body"
        hint="No currency symbols, amounts or @handles — this lands on a lock screen."
      >
        <Textarea id="push-body" rows={3} defaultValue="Ski Trip '26 is ready to go." />
      </FormField>
    </div>
  )
}

export function NoHint() {
  return (
    <div className="max-w-sm">
      <FormField label="Job name" htmlFor="job">
        <Input id="job" defaultValue="expire-stale-invites" />
      </FormField>
    </div>
  )
}
