import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Several test files share the on-disk file-store (.data/phase2a-store.json)
    // for isolation via resetStore() — running test files in parallel workers
    // races two files' resets/mutations against the same physical file.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
