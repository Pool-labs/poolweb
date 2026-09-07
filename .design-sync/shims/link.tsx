// design-sync shim for `next/link` — the preview/design runtime has no Next
// router, so Link degrades to a plain anchor with the same visual result.
import * as React from "react"

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href?: string | { pathname?: string }
  prefetch?: boolean
  replace?: boolean
  scroll?: boolean
  shallow?: boolean
  legacyBehavior?: boolean
  locale?: string | false
}

const Link = React.forwardRef<HTMLAnchorElement, Props>(function Link(
  { href, prefetch, replace, scroll, shallow, legacyBehavior, locale, children, ...rest },
  ref,
) {
  const h = typeof href === "string" ? href : href?.pathname ?? "#"
  return (
    <a ref={ref} href={h} {...rest}>
      {children}
    </a>
  )
})

export default Link
