import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  // Single worker: the Phase 2a spec mutates shared in-memory server state
  // (via the demo-state switcher) that other spec files read — running
  // workers in parallel would race against those mutations.
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
  },
  webServer: {
    // Dev mode (not `start`) so the dev-only demo-state switcher API is
    // reachable — the Phase 2a visual spec uses it to reach every screen
    // state (e.g. brief "sent", proposal "changes_requested") without
    // replaying the full flow for each one.
    command: "npm run dev -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
