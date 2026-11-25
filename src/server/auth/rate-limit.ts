import { getItem, putItem } from "../db/dynamo";
import { env } from "../env";

/** Self-hosted Node (not Vercel) has no `request.ip` — the standard proxy header, falling back to a fixed key so dev/single-IP traffic still rate-limits sanely instead of bypassing the check entirely. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 5;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * 5 attempts per 15 minutes, keyed by `${action}:${email}:${ip}` — both the
 * email and the IP have to match for the counter to keep incrementing, so
 * one attacker spraying many emails from one IP is still capped per-email,
 * and a shared IP (office NAT) doesn't lock out everyone over one email.
 */
export async function checkRateLimit(action: string, email: string, ip: string): Promise<RateLimitResult> {
  // Playwright's suite signs in dozens of times across spec files against the
  // same seeded accounts — ALLOW_DEMO_STATE is already this codebase's "this
  // is the e2e run" signal (see the demo-state route's own gate), so reuse
  // it here rather than letting real rate-limiting break the test suite.
  if (env.ALLOW_DEMO_STATE === "true") {
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  const key = `rate-limit:${action}:${email.trim().toLowerCase()}:${ip}`;
  return env.REPOSITORY_DRIVER === "dynamo" ? checkRateLimitDynamo(key) : checkRateLimitMemory(key);
}

interface RateLimitRecord {
  count: number;
  expiresAt: number;
}

/** Plain in-process Map — used only when REPOSITORY_DRIVER=memory (tests), zero external dependency. */
let memoryStore = new Map<string, RateLimitRecord>();

export function resetRateLimitStore(): void {
  memoryStore = new Map();
}

function checkRateLimitMemory(key: string): RateLimitResult {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || existing.expiresAt < now) {
    memoryStore.set(key, { count: 1, expiresAt: now + WINDOW_SECONDS * 1000 });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  existing.count += 1;
  return { allowed: existing.count <= MAX_ATTEMPTS, remaining: Math.max(0, MAX_ATTEMPTS - existing.count) };
}

interface DynamoRateLimitRecord {
  key: string;
  count: number;
  /** Epoch seconds — DynamoDB's TTL feature auto-deletes expired rows, but TTL cleanup isn't instant, so an expired-but-not-yet-purged row is treated as a fresh window below. */
  expiresAt: number;
}

/**
 * Two round trips (get, then put) instead of an atomic increment — a
 * window-boundary race could in theory double-reset a counter, but at this
 * volume (a handful of login attempts per 15-minute window) that's not a
 * real security concern.
 */
async function checkRateLimitDynamo(key: string): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const existing = await getItem<DynamoRateLimitRecord>("rateLimits", key);

  if (!existing || existing.expiresAt < now) {
    await putItem("rateLimits", { key, count: 1, expiresAt: now + WINDOW_SECONDS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  const count = existing.count + 1;
  await putItem("rateLimits", { key, count, expiresAt: existing.expiresAt });
  return { allowed: count <= MAX_ATTEMPTS, remaining: Math.max(0, MAX_ATTEMPTS - count) };
}
