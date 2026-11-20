import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  // Phase 3: raised from 1 — running against a real production build (see
  // webServer below) removed most of the dev-mode compile-on-request
  // flakiness that motivated a single worker. Spec files still mutate shared
  // store state (demo-state, resetStore), so a file that races against
  // another file's fixtures is still possible — each file's own tests stay
  // `mode: "serial"` internally, but cross-file isolation is not guaranteed.
  workers: 2,
  use: {
    baseURL: "http://localhost:3100",
  },
  webServer: {
    // Production build + `next start`, not `next dev` — closer to real
    // behaviour and removes Turbopack's per-request dev compile as a source
    // of timing flakes. ALLOW_DEMO_STATE=true keeps the demo-state fixture
    // route reachable even though NODE_ENV is now "production" (see
    // app/api/dev/demo-state/route.ts) — every spec still uses it.
    command: "npm run build && ALLOW_DEMO_STATE=true npm run start -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
