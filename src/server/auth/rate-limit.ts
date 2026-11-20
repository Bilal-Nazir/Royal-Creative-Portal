import { getRedis } from "../db/redis";
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
 * Fixed window via Redis INCR+EXPIRE — simple, and fine at this attempt
 * volume (a sliding window only matters once you're rate-limiting thousands
 * of requests/sec).
 */
export async function checkRateLimit(action: string, email: string, ip: string): Promise<RateLimitResult> {
  // Playwright's suite signs in dozens of times across spec files against the
  // same seeded accounts — ALLOW_DEMO_STATE is already this codebase's "this
  // is the e2e run" signal (see the demo-state route's own gate), so reuse
  // it here rather than letting real rate-limiting break the test suite.
  if (env.ALLOW_DEMO_STATE === "true") {
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  const redis = getRedis();
  const key = `rate-limit:${action}:${email.trim().toLowerCase()}:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }
  return { allowed: count <= MAX_ATTEMPTS, remaining: Math.max(0, MAX_ATTEMPTS - count) };
}
