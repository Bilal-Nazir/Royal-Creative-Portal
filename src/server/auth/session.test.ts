import { afterAll, afterEach, describe, expect, it } from "vitest";
import { sessionService } from "./session";
import { getRedis } from "../db/redis";

/**
 * Exercises the real Redis-backed session store (REDIS_URL in
 * vitest.config.ts points at DB index 1, never the dev DB 0 — see
 * PROJECT_CONTEXT.md). Requires Redis to be reachable; these are the only
 * tests in the suite that talk to a real external service rather than the
 * memory driver.
 */

const agencyPayload = { userId: "u-session-test-agency", role: "agency" as const, name: "Test Agency", agencyRole: "member" as const };
const clientPayload = {
  userId: "u-session-test-client",
  role: "client" as const,
  name: "Test Client",
  clientRole: "participant" as const,
  clientId: "client-session-test",
};

afterEach(async () => {
  await getRedis().flushdb();
});

afterAll(async () => {
  await getRedis().quit();
});

describe("RedisSessionService", () => {
  it("create() then verify() round-trips the payload", async () => {
    const token = await sessionService.create(agencyPayload);
    const verified = await sessionService.verify(token);
    expect(verified).toEqual(agencyPayload);
  });

  it("verify() returns null for an unknown token", async () => {
    expect(await sessionService.verify("not-a-real-token")).toBeNull();
  });

  it("destroy() deletes the session — a destroyed token no longer verifies", async () => {
    const token = await sessionService.create(clientPayload);
    expect(await sessionService.verify(token)).not.toBeNull();

    await sessionService.destroy(token);
    expect(await sessionService.verify(token)).toBeNull();
  });

  it("revokeAllForUser() deletes every session that user holds, across multiple logins", async () => {
    const tokenA = await sessionService.create(agencyPayload);
    const tokenB = await sessionService.create(agencyPayload);
    const otherUserToken = await sessionService.create(clientPayload);

    await sessionService.revokeAllForUser(agencyPayload.userId);

    expect(await sessionService.verify(tokenA)).toBeNull();
    expect(await sessionService.verify(tokenB)).toBeNull();
    // A different user's session is untouched.
    expect(await sessionService.verify(otherUserToken)).toEqual(clientPayload);
  });

  it("verify() refreshes the TTL (sliding expiry)", async () => {
    const token = await sessionService.create(agencyPayload);
    const redis = getRedis();
    await redis.expire(`session:${token}`, 5); // simulate time having passed, close to expiry
    await sessionService.verify(token);
    const ttl = await redis.ttl(`session:${token}`);
    expect(ttl).toBeGreaterThan(5); // back up near the full 8-hour window
  });
});
