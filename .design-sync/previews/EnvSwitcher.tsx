import { EnvSwitcher } from "my-v0-project"

const ALL = ["staging", "production", "local"] as const

// Sessions are PER-ENVIRONMENT: `authenticatedEnvs` is presence-only (never a
// token), and switching INTO production takes an extra confirmation step.
export function OnPage() {
  return (
    <EnvSwitcher env="staging" availableEnvs={[...ALL]} authenticatedEnvs={["staging", "production"]} />
  )
}

export function OnBanner() {
  return (
    <div className="rounded-lg bg-amber-500 p-4">
      <EnvSwitcher
        env="staging"
        availableEnvs={[...ALL]}
        authenticatedEnvs={["staging"]}
        surface={"banner" as never}
      />
    </div>
  )
}
