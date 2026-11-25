import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Several test files share the in-process memory-store for isolation via
    // resetStore() — each test file already gets its own worker/module graph
    // (so its own store instance), but kept serial for low risk since this
    // matched the prior file-store-contention reasoning.
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      AUTH_SECRET: "test-secret-at-least-16-chars-long",
      REPOSITORY_DRIVER: "memory",
      // Tests exercise the simulate-success/simulate-failure demo charge path directly — PAYMENT_DRIVER=mock is explicitly allowed outside production (env.ts).
      PAYMENT_DRIVER: "mock",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
