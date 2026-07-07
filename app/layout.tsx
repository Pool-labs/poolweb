import type React from "react"
import type { Metadata } from "next"
import { Baloo_2, DM_Sans } from "next/font/google"
import "./globals.css"
import "./mobile.css"
import Header from "@/components/header"
import Footer from "@/components/footer"
import ScrollToTop from "@/components/scroll-to-top"
import { ThemeProvider } from "@/components/theme-provider"
import MobileInit from "@/components/mobile-init"
import { Analytics } from "@vercel/analytics/next"

// Two families max: chunky rounded display (H1/H2/wordmark only) + friendly body sans.
const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
})
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Pool - A Social Network for the Things You Do Together",
  description:
    "Pool is a social network for people who spend time — and money — together. Create pools around your roommates, brunch crew, travel group, or everyday coffee run. Pool. Tap. Done.",
  icons: {
    icon: "/images/pool-logo-new.png"
  },
  generator: 'v0.app',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FDFCF9' },
    { media: '(prefers-color-scheme: dark)', color: '#14224A' }
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${baloo.variable} font-sans min-h-screen relative overflow-x-hidden`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <MobileInit />
          <ScrollToTop />
          <Header />
          <main>{children}</main>
          <Footer />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
