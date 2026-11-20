import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { inviteTeamMember, inviteClient, acceptInvite, getInviteByToken } from "./invite-service";
import { inviteRepository } from "../repositories/container";
import { resetStore } from "../repositories/in-memory/memory-store";
import { emailProvider } from "../email";
import type { SessionPayload } from "../auth/session";

/** Mirrors the hashing invite-service.ts does internally — needed here only to look a stored invite up directly for the expiry test below. */
function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/** Invite accept/expiry/one-time-use, against the memory driver (REPOSITORY_DRIVER=memory in vitest.config.ts) — no Mongo needed. */

const agencyOwner: SessionPayload = { userId: "u-jerry", role: "agency", name: "Jerry Royal", agencyRole: "owner" };
const agencyMember: SessionPayload = { userId: "u-jordan", role: "agency", name: "Jordan Hale", agencyRole: "member" };
const clientParticipant: SessionPayload = {
  userId: "u-alex",
  role: "client",
  name: "Alex",
  clientRole: "participant",
  clientId: "royal-trendsy",
};

function extractLink(sendCalls: { calls: unknown[][] }): string {
  const body = (sendCalls.calls.at(-1)?.[0] as { text: string }).text;
  const match = body.match(/https?:\/\/\S+/);
  if (!match) throw new Error("no link found in sent email body");
  return match[0];
}

function tokenFromLink(link: string): string {
  return link.split("/").pop()!;
}

afterEach(() => {
  resetStore();
  vi.restoreAllMocks();
});

describe("inviteTeamMember / inviteClient permissions", () => {
  it("rejects a non-owner/admin agency member", async () => {
    const result = await inviteTeamMember(agencyMember, { name: "New Hire", email: "new-hire@example.com", agencyRole: "member" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("rejects a client session for team invites", async () => {
    const result = await inviteTeamMember(clientParticipant, { name: "New Hire", email: "new-hire2@example.com", agencyRole: "member" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("rejects inviting an email that already has an account", async () => {
    const result = await inviteTeamMember(agencyOwner, { name: "Jerry Again", email: "jerry@royalcreative.co", agencyRole: "member" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("rejects a client session sending a client invite", async () => {
    const result = await inviteClient(clientParticipant, { name: "Someone", email: "someone@example.com", clientId: "royal-trendsy" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });
});

describe("acceptInvite", () => {
  it("creates the user and lets them be found by email afterward, and is one-time-use", async () => {
    const sendSpy = vi.spyOn(emailProvider, "send");
    const result = await inviteTeamMember(agencyOwner, { name: "New Hire", email: "new-hire-3@example.com", agencyRole: "member" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const token = tokenFromLink(extractLink(sendSpy.mock));

    const accepted = await acceptInvite(token, "a-strong-password");
    expect(accepted.ok).toBe(true);
    if (accepted.ok) expect(accepted.data.email).toBe("new-hire-3@example.com");

    // One-time use — accepting again with the same token fails.
    const secondAttempt = await acceptInvite(token, "another-password");
    expect(secondAttempt.ok).toBe(false);
    if (!secondAttempt.ok) expect(secondAttempt.status).toBe(400);
  });

  it("rejects a password shorter than 8 characters", async () => {
    const sendSpy = vi.spyOn(emailProvider, "send");
    await inviteTeamMember(agencyOwner, { name: "New Hire", email: "new-hire-4@example.com", agencyRole: "member" });
    const token = tokenFromLink(extractLink(sendSpy.mock));

    const result = await acceptInvite(token, "short");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("rejects an unknown token", async () => {
    const result = await acceptInvite("not-a-real-token", "a-strong-password");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("rejects an expired invite", async () => {
    const sendSpy = vi.spyOn(emailProvider, "send");
    await inviteTeamMember(agencyOwner, { name: "New Hire", email: "new-hire-5@example.com", agencyRole: "member" });
    const token = tokenFromLink(extractLink(sendSpy.mock));

    const stored = await inviteRepository.findByTokenHash(hashToken(token));
    expect(stored).not.toBeNull();
    await inviteRepository.update({ ...stored!, expiresAt: new Date(Date.now() - 1000).toISOString() });

    const result = await acceptInvite(token, "a-strong-password");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });
});

describe("getInviteByToken", () => {
  it("returns null once accepted, so the /invite/[token] page can't be reused to re-display the form", async () => {
    const sendSpy = vi.spyOn(emailProvider, "send");
    await inviteTeamMember(agencyOwner, { name: "New Hire", email: "new-hire-6@example.com", agencyRole: "member" });
    const token = tokenFromLink(extractLink(sendSpy.mock));

    expect(await getInviteByToken(token)).not.toBeNull();
    await acceptInvite(token, "a-strong-password");
    expect(await getInviteByToken(token)).toBeNull();
  });
});
