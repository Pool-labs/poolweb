// design-sync shim for `next/navigation` — inert router surface so components
// that call useRouter()/usePathname() render instead of throwing.
const noop = () => {}

export function useRouter() {
  return { push: noop, replace: noop, back: noop, forward: noop, refresh: noop, prefetch: noop }
}
export function usePathname() {
  return "/"
}
export function useSearchParams() {
  return new URLSearchParams()
}
export function useParams() {
  return {} as Record<string, string>
}
export function useSelectedLayoutSegment() {
  return null
}
export function useSelectedLayoutSegments() {
  return [] as string[]
}
export function redirect(_url: string) {}
export function permanentRedirect(_url: string) {}
export function notFound() {}
