import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "./mobile.css"
import Header from "@/components/header"
import Footer from "@/components/footer"
import DecorativeBackground from "@/components/decorative-background"
import ScrollToTop from "@/components/scroll-to-top"
import { ThemeProvider } from "@/components/theme-provider"
import MobileInit from "@/components/mobile-init"
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ["latin"] })

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
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#020817' }
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
      <body className={`${inter.className} min-h-screen relative overflow-x-hidden`} style={{ backgroundColor: 'transparent' }}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <MobileInit />
          <DecorativeBackground />
          <ScrollToTop />
          <div className="relative z-10">
            <Header />
            <main>{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
