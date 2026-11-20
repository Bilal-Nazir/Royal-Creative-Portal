import { defineConfig } from "vitest/config";
import path from "node:path";
import { readFileSync, existsSync } from "node:fs";

/**
 * Reads REDIS_URL out of .env.local (gitignored) rather than hardcoding a
 * real credential into this tracked config file, and points it at DB index
 * 1 instead of dev's DB 0 — tests must never share a database with dev data.
 * Falls back to a no-auth local default if .env.local doesn't have one
 * (e.g. a fresh checkout before first local setup).
 */
function testRedisUrl(): string {
  const envPath = path.resolve(__dirname, ".env.local");
  let devUrl: string | undefined;
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf-8").split("\n")) {
      const match = line.match(/^REDIS_URL=(.*)$/);
      if (match) devUrl = match[1].trim();
    }
  }
  const base = devUrl ?? "redis://127.0.0.1:6379";
  return base.replace(/\/\d*$/, "").concat("/1");
}

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
      MONGODB_URI: "mongodb://127.0.0.1:27017/rc_portal_test",
      REDIS_URL: testRedisUrl(),
      REPOSITORY_DRIVER: "memory",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
