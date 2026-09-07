import { EnvBanner } from "my-v0-project"

const ALL = ["staging", "production", "local"] as const

// The full-width environment strip, rendered on EVERY admin page (signed in and
// on login) from the server-resolved env. Tone carries the message: production
// solid red, staging amber, local muted — and each states the CONSEQUENCE, not
// just the name.
export function Staging() {
  return <EnvBanner env="staging" availableEnvs={[...ALL]} authenticatedEnvs={["staging"]} />
}

export function Production() {
  return <EnvBanner env="production" availableEnvs={[...ALL]} authenticatedEnvs={["staging", "production"]} />
}

export function Local() {
  return <EnvBanner env="local" availableEnvs={[...ALL]} authenticatedEnvs={[]} />
}
