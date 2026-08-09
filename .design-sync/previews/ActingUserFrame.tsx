import { ActingUserFrame, FormField, Input } from "my-v0-project"

// Amber frame marking the user a workflow ACTS AS, distinguishing it from the
// workflow's target.
export function Default() {
  return (
    <div className="max-w-sm">
      <ActingUserFrame>
        <FormField label="Actor" htmlFor="actor" hint="This account performs the action.">
          <Input id="actor" defaultValue="maya@poolapp.co" />
        </FormField>
      </ActingUserFrame>
    </div>
  )
}

export function AroundPlainContent() {
  return (
    <div className="max-w-sm">
      <ActingUserFrame>
        <p className="text-sm">Priya Raman — usr_1c8e (pool owner)</p>
      </ActingUserFrame>
    </div>
  )
}
