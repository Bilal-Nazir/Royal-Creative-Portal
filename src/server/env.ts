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

  // Phase 4b
  PAYMENT_DRIVER: z.enum(["bank", "mock"]).default("bank"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  EMAIL_DRIVER: z.enum(["console", "smtp"]).default("console"),

  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\n\nCheck .env.local against .env.example.`);
  }
  const env = parsed.data;

  // Mock payments are a demo/test convenience only — never allowed to go live by accident.
  if (env.PAYMENT_DRIVER === "mock" && env.NODE_ENV === "production") {
    throw new Error('PAYMENT_DRIVER=mock is not allowed when NODE_ENV=production. Set PAYMENT_DRIVER=bank (or add Stripe later).');
  }
  if (env.STORAGE_DRIVER === "s3" && (!env.S3_BUCKET || !env.S3_REGION)) {
    throw new Error("STORAGE_DRIVER=s3 requires S3_BUCKET and S3_REGION.");
  }
  if (env.EMAIL_DRIVER === "smtp" && (!env.SMTP_HOST || !env.SMTP_FROM)) {
    throw new Error("EMAIL_DRIVER=smtp requires SMTP_HOST and SMTP_FROM.");
  }

  return env;
}

export const env: Env = loadEnv();
