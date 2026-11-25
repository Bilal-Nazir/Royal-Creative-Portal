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
  REPOSITORY_DRIVER: z.enum(["dynamo", "memory"]).default("dynamo"),
  ALLOW_DEMO_STATE: z.string().optional(),
  APP_URL: z.string().default("http://localhost:3000"),

  // DynamoDB — credentials are picked up by the AWS SDK's own default chain
  // (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION env vars), not
  // read through this schema. DYNAMO_TABLE_PREFIX scopes table names per
  // environment (dev/staging/prod) so they can share one AWS account.
  AWS_REGION: z.string().optional(),
  DYNAMO_TABLE_PREFIX: z.string().optional(),

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
  // AWS_REGION is deliberately NOT required here even though it's used by local scripts (table
  // creation/seeding) — in a real deployment (e.g. AWS Amplify Hosting), "AWS_" is a reserved env
  // var prefix the platform won't let you set manually, and the AWS SDK resolves the region on its
  // own from the Lambda/compute runtime regardless of whether this app's own config captured it.
  if (env.REPOSITORY_DRIVER === "dynamo" && !env.DYNAMO_TABLE_PREFIX) {
    throw new Error("REPOSITORY_DRIVER=dynamo requires DYNAMO_TABLE_PREFIX.");
  }
  if (env.STORAGE_DRIVER === "s3" && (!env.S3_BUCKET || !env.S3_REGION)) {
    throw new Error("STORAGE_DRIVER=s3 requires S3_BUCKET and S3_REGION.");
  }
  if (env.EMAIL_DRIVER === "smtp" && (!env.SMTP_HOST || !env.SMTP_FROM)) {
    throw new Error("EMAIL_DRIVER=smtp requires SMTP_HOST and SMTP_FROM.");
  }

  return env;
}

let cached: Env | null = null;

/**
 * Lazy by design: some bundles (notably Next's middleware/proxy chunk) get
 * required during Lambda cold start, before Amplify Hosting finishes
 * injecting console-configured env vars into that execution context. A
 * top-level `loadEnv()` call would crash those bundles with false
 * "undefined" errors even though the vars are set correctly. Validating on
 * first property access instead defers the check until an actual request is
 * being handled, by which point the vars are present.
 */
export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string | symbol) {
    if (!cached) cached = loadEnv();
    return cached[prop as keyof Env];
  },
  has(_target, prop) {
    if (!cached) cached = loadEnv();
    return prop in cached;
  },
});
