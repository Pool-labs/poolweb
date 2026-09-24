import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Unit tests (`pnpm test`) — fast, offline, no browser, no Firebase project.
 * They live in tests/unit and never touch the Playwright suite in tests/e2e.
 *
 * `server-only` throws when imported outside a React Server Components build;
 * tests run plain Node, so it is aliased to an empty module here.
 */
const fromRoot = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  // tsconfig says `jsx: preserve` (Next compiles JSX itself), which would make
  // Vite leave JSX untransformed. The first unit test that RENDERS a component
  // (tests/unit/admin/feedback.test.ts, the #720 XSS guard, via
  // react-dom/server) needs it compiled with the automatic runtime.
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: {
      '@': fromRoot('.'),
      'server-only': fromRoot('./tests/unit/support/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
});
