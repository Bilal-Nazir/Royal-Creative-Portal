import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getRedis } from "../db/redis";
import type { AgencyRole, ClientRole } from "../domain/user";

export const SESSION_COOKIE_NAME = "rc_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours — also the sliding-expiry window, refreshed on every verify()

const SESSION_KEY_PREFIX = "session:";
const USER_SESSIONS_KEY_PREFIX = "user-sessions:";

const sessionPayloadSchema = z.discriminatedUnion("role", [
  z.object({
    userId: z.string(),
    role: z.literal("agency"),
    name: z.string(),
    agencyRole: z.enum(["owner", "admin", "member"]),
  }),
  z.object({
    userId: z.string(),
    role: z.literal("client"),
    name: z.string(),
    clientRole: z.enum(["participant", "viewer"]),
    clientId: z.string(),
  }),
]);

export type SessionPayload =
  | { userId: string; role: "agency"; name: string; agencyRole: AgencyRole }
  | { userId: string; role: "client"; name: string; clientRole: ClientRole; clientId: string };

/**
 * Behind an interface so the storage (Redis, below) and the auth
 * provider could both change again later without touching middleware, route
 * handlers, or UI code that depends on SessionService.
 */
export interface SessionService {
  create(payload: SessionPayload): Promise<string>;
  verify(token: string): Promise<SessionPayload | null>;
  /** Logout — deletes this one session. */
  destroy(token: string): Promise<void>;
  /** Password change or role change — deletes every session belonging to this user, everywhere they're signed in. */
  revokeAllForUser(userId: string): Promise<void>;
}

/**
 * Opaque random session id (the cookie value), with the actual session data
 * held in Redis under a TTL. `verify()` refreshes that TTL on every call
 * (sliding expiry) — an active user is never logged out mid-session, but an
 * abandoned one expires `SESSION_MAX_AGE_SECONDS` after their last request.
 * A per-user Redis set (`user-sessions:{userId}`) tracks every token issued
 * to them, so a password/role change can revoke all of them in one pass
 * without a database scan.
 */
class RedisSessionService implements SessionService {
  async create(payload: SessionPayload): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    const redis = getRedis();
    await redis.set(SESSION_KEY_PREFIX + token, JSON.stringify(payload), "EX", SESSION_MAX_AGE_SECONDS);
    await redis.sadd(USER_SESSIONS_KEY_PREFIX + payload.userId, token);
    return token;
  }

  async verify(token: string): Promise<SessionPayload | null> {
    const redis = getRedis();
    const raw = await redis.get(SESSION_KEY_PREFIX + token);
    if (!raw) return null;

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return null;
    }
    const result = sessionPayloadSchema.safeParse(parsedJson);
    if (!result.success) return null;

    // Sliding expiry: every verified request extends the session instead of
    // it dying at a fixed clock time.
    await redis.expire(SESSION_KEY_PREFIX + token, SESSION_MAX_AGE_SECONDS);
    return result.data;
  }

  async destroy(token: string): Promise<void> {
    const redis = getRedis();
    const raw = await redis.get(SESSION_KEY_PREFIX + token);
    await redis.del(SESSION_KEY_PREFIX + token);
    if (raw) {
      const result = sessionPayloadSchema.safeParse(JSON.parse(raw));
      if (result.success) await redis.srem(USER_SESSIONS_KEY_PREFIX + result.data.userId, token);
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const redis = getRedis();
    const key = USER_SESSIONS_KEY_PREFIX + userId;
    const tokens = await redis.smembers(key);
    if (tokens.length > 0) {
      await redis.del(...tokens.map((t) => SESSION_KEY_PREFIX + t));
    }
    await redis.del(key);
  }
}

export const sessionService: SessionService = new RedisSessionService();
