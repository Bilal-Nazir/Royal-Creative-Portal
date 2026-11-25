import { afterEach, describe, expect, it, vi } from "vitest";
import { sessionService } from "./session";
import { resetSessionStore } from "./session-memory";
import { SESSION_MAX_AGE_SECONDS } from "./session-types";

const agencyPayload = { userId: "u-session-test-agency", role: "agency" as const, name: "Test Agency", agencyRole: "member" as const };
const clientPayload = {
  userId: "u-session-test-client",
  role: "client" as const,
  name: "Test Client",
  clientRole: "participant" as const,
  clientId: "client-session-test",
};

afterEach(() => {
  resetSessionStore();
  vi.useRealTimers();
});

describe("InMemorySessionService", () => {
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

  it("verify() refreshes the expiry (sliding expiry)", async () => {
    vi.useFakeTimers();
    const token = await sessionService.create(agencyPayload);

    // Jump to just before the original expiry — verify() should succeed and push expiry forward again.
    vi.advanceTimersByTime((SESSION_MAX_AGE_SECONDS - 60) * 1000);
    expect(await sessionService.verify(token)).not.toBeNull();

    // Jump past where the ORIGINAL expiry would have been — still valid because the verify() above slid it forward.
    vi.advanceTimersByTime(120 * 1000);
    expect(await sessionService.verify(token)).not.toBeNull();
  });
});
