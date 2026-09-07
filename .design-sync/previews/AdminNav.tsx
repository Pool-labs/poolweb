import { AdminNav } from "my-v0-project"

// The nav keeps only the environment BADGE (the switcher lives on EnvBanner).
// Production is deliberately the loudest thing on the page.
export function Staging() {
  return <AdminNav env="staging" />
}

export function Production() {
  return <AdminNav env="production" />
}

export function Local() {
  return <AdminNav env="local" />
}
