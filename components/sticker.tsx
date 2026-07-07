import Link from "next/link"
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

/**
 * Sticker primitives — every interactive/card-like element is a die-cut
 * sticker: navy border, hard offset shadow, generous radius. Base styles
 * live in globals.css (.sticker / .btn-sticker / .chip-sticker).
 */

const buttonVariants = {
  yellow: "btn-yellow",
  blue: "btn-blue",
  pink: "btn-pink",
  ghost: "btn-ghost",
} as const

type Variant = keyof typeof buttonVariants

type StickerLinkProps = { href: string; variant?: Variant } & Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
>
type StickerBtnProps = { href?: undefined; variant?: Variant } & ButtonHTMLAttributes<HTMLButtonElement>

export function StickerButton(props: StickerLinkProps | StickerBtnProps) {
  if (props.href !== undefined) {
    const { href, variant = "yellow", className, children, ...rest } = props
    return (
      <Link href={href} className={cn("btn-sticker", buttonVariants[variant], className)} {...rest}>
        {children}
      </Link>
    )
  }
  const { variant = "yellow", className, children, type = "button", ...rest } = props
  return (
    <button type={type} className={cn("btn-sticker", buttonVariants[variant], className)} {...rest}>
      {children}
    </button>
  )
}

export function StickerCard({
  className,
  interactive = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return <div className={cn("sticker", interactive && "sticker-interactive", className)} {...props} />
}

export function Chip({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("chip-sticker", className)} {...props} />
}
