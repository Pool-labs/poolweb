# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

No test framework is configured.

## Architecture

**Next.js 15 (App Router) with React 19**, deployed on Vercel. Single web application (not a monorepo) for "POOL" — a group fund management service.

### Key Directories

- `app/` — Next.js app router: pages, layouts, API routes, and Firebase config
- `app/firebase/` — Firebase client config (`firebaseConfig.ts`) and Firestore service functions (`firestore.ts`)
- `app/api/` — API routes: `contact`, `preregister`, `questionnaire`, `location`, `update-site-visit`
- `components/` — Reusable React components; `components/ui/` is shadcn/ui primitives
- `lib/` — Utilities (classname merging, location detection, mobile helpers)
- `styles/` — Global and theme CSS

### Backend & Data

- **Firebase Firestore** for persistence: `preregistered_users` and `admins` collections
- **Firebase Auth** (email/password) for admin login only; public pages have no auth
- **Resend** for sending contact form emails
- Firestore service layer lives in `app/firebase/firestore.ts`

### Admin Section

- `app/admin/layout.tsx` acts as an auth guard — checks Firebase Auth + `admins` Firestore collection
- Dashboard at `app/admin/dashboard/` manages preregistered users
- Stats page at `app/admin/stats/`

### UI & Styling

- **Tailwind CSS** with custom brand colors (`pool-blue`, `pool-pink`, `pool-navy`, `money-green`, etc.) and custom animations defined in `tailwind.config.ts`
- **shadcn/ui** components configured via `components.json` (path alias `@/components/ui`)
- **Framer Motion** for animations
- **Radix UI** primitives underpin shadcn components
- Dark mode via `next-themes` (class-based)

### Forms & Validation

- `react-hook-form` with `zod` schemas via `@hookform/resolvers`
- Questionnaire saves progress to localStorage (`survey_progress` key)

### Path Alias

`@/*` maps to the project root (configured in `tsconfig.json`).

## Environment Variables

All Firebase config vars are prefixed `NEXT_PUBLIC_FIREBASE_*`. The Firebase project ID is `pool-857f1`.

## Build Notes

- TypeScript errors and ESLint warnings are **ignored** during `next build` (configured in `next.config.mjs`)
- Images are set to unoptimized mode
