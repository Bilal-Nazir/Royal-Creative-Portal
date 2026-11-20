import { z } from "zod";

/**
 * Validated once at import time (and again explicitly from instrumentation.ts
 * on server boot) so a missing/malformed env var fails fast with a clear
 * message instead of surfacing as a confusing runtime error deep in a
 * repository or session call.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters."),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required."),
  REDIS_URL: z.string().min(1, "REDIS_URL is required."),
  REPOSITORY_DRIVER: z.enum(["mongo", "memory"]).default("mongo"),
  ALLOW_DEMO_STATE: z.string().optional(),
  APP_URL: z.string().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\n\nCheck .env.local against .env.example.`);
  }
  return parsed.data;
}

export const env: Env = loadEnv();
