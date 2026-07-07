import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Brand tokens — sticker-pop system (see REDESIGN_PLAN.md)
        "pool-blue": "#4EC3F5",
        "pool-yellow": "#FFCE3E",
        "pool-pink": "#FF77B0",
        "pool-green": "#63C666",
        "pool-gold": "#F5B63C",
        navy: "#14224A",
        cloud: "#FDFCF9",
        "sky-tint": "#EAF7FE",
        // Flat section-band tints (from the framed-card backgrounds in the assets)
        "pool-sky": "#C9EAFB",
        "tint-yellow": "#FFF1C9",
        "tint-pink": "#FFE3F0",
        "tint-green": "#DFF4DF",
        // Legacy names kept for untouched routes (admin, app-like pages)
        "pool-orange": "#FF9800",
        "pool-purple": "#9C27B0",
        "pool-navy": "#14224A",
        "money-green": "#2E7D32",
        "coin-gold": "#F5B63C",
        "splash-blue": "#4EC3F5",
        "droplet-cyan": "#00BCD4",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "bounce-slow": "bounce 3s infinite",
        wiggle: "wiggle 1s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "money-rain": "money-rain 10s linear infinite",
        "droplet-fall": "droplet-fall 4s ease-in infinite",
        splash: "splash 2s ease-out infinite",
        pulse: "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px) translateX(0px)" },
          "33%": { transform: "translateY(-15px) translateX(10px)" },
          "66%": { transform: "translateY(10px) translateX(-5px)" },
        },
        "money-rain": {
          "0%": { transform: "translateY(-100vh) rotate(0deg)" },
          "100%": { transform: "translateY(100vh) rotate(360deg)" },
        },
        "droplet-fall": {
          "0%": { transform: "translateY(-20px) scale(0)" },
          "50%": { transform: "translateY(0px) scale(1)" },
          "100%": { transform: "translateY(20px) scale(0)" },
        },
        splash: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.1)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
