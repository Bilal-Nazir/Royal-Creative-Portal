import { createHash } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { requestPasswordReset, resetPassword, isResetTokenValid } from "./password-reset-service";
import { passwordResetTokenRepository, userRepository } from "../repositories/container";
import { resetStore } from "../repositories/in-memory/memory-store";
import { emailProvider } from "../email/email-provider";
import { verifyPassword } from "../auth/password";
import { sessionService } from "../auth/session";
import { getRedis } from "../db/redis";

/** Password-reset expiry/one-time-use, against the memory driver for users/tokens and real Redis (DB 1) for session revocation. */

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function extractLink(sendCalls: { calls: unknown[][] }): string {
  const body = (sendCalls.calls.at(-1)?.[0] as { body: string }).body;
  const match = body.match(/https?:\/\/\S+/);
  if (!match) throw new Error("no link found in sent email body");
  return match[0];
}

function tokenFromLink(link: string): string {
  return link.split("/").pop()!;
}

afterEach(async () => {
  resetStore();
  vi.restoreAllMocks();
  await getRedis().flushdb();
});

afterAll(async () => {
  await getRedis().quit();
});

describe("requestPasswordReset", () => {
  it("sends an email when the account exists", async () => {
    const sendSpy = vi.spyOn(emailProvider, "send");
    const result = await requestPasswordReset("jerry@royalcreative.co");
    expect(result.ok).toBe(true);
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("does not reveal whether the email exists — same ok result, no email sent, for an unknown address", async () => {
    const sendSpy = vi.spyOn(emailProvider, "send");
    const result = await requestPasswordReset("nobody-at-all@example.com");
    expect(result.ok).toBe(true);
    expect(sendSpy).not.toHaveBeenCalled();
  });
});

describe("resetPassword", () => {
  it("sets the new password and is one-time-use", async () => {
    const sendSpy = vi.spyOn(emailProvider, "send");
    await requestPasswordReset("jerry@royalcreative.co");
    const token = tokenFromLink(extractLink(sendSpy.mock));

    const result = await resetPassword(token, "a-brand-new-password");
    expect(result.ok).toBe(true);

    const user = await userRepository.findByEmail("jerry@royalcreative.co");
    expect(await verifyPassword("a-brand-new-password", user!.passwordHash)).toBe(true);

    // One-time use.
    const secondAttempt = await resetPassword(token, "yet-another-password");
    expect(secondAttempt.ok).toBe(false);
    if (!secondAttempt.ok) expect(secondAttempt.status).toBe(400);
  });

  it("revokes every existing session for that user on success", async () => {
    const user = await userRepository.findByEmail("jerry@royalcreative.co");
    const existingToken = await sessionService.create({ userId: user!.id, role: "agency", name: user!.name, agencyRole: "owner" });
    expect(await sessionService.verify(existingToken)).not.toBeNull();

    const sendSpy = vi.spyOn(emailProvider, "send");
    await requestPasswordReset("jerry@royalcreative.co");
    const token = tokenFromLink(extractLink(sendSpy.mock));
    await resetPassword(token, "a-brand-new-password");

    expect(await sessionService.verify(existingToken)).toBeNull();
  });

  it("rejects a password shorter than 8 characters", async () => {
    const sendSpy = vi.spyOn(emailProvider, "send");
    await requestPasswordReset("jerry@royalcreative.co");
    const token = tokenFromLink(extractLink(sendSpy.mock));

    const result = await resetPassword(token, "short");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("rejects an unknown token", async () => {
    const result = await resetPassword("not-a-real-token", "a-brand-new-password");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("rejects an expired token", async () => {
    const sendSpy = vi.spyOn(emailProvider, "send");
    await requestPasswordReset("jerry@royalcreative.co");
    const token = tokenFromLink(extractLink(sendSpy.mock));

    const stored = await passwordResetTokenRepository.findByTokenHash(hashToken(token));
    expect(stored).not.toBeNull();
    await passwordResetTokenRepository.update({ ...stored!, expiresAt: new Date(Date.now() - 1000).toISOString() });

    const result = await resetPassword(token, "a-brand-new-password");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });
});

describe("isResetTokenValid", () => {
  it("is true for a fresh token, false once used", async () => {
    const sendSpy = vi.spyOn(emailProvider, "send");
    await requestPasswordReset("jerry@royalcreative.co");
    const token = tokenFromLink(extractLink(sendSpy.mock));

    expect(await isResetTokenValid(token)).toBe(true);
    await resetPassword(token, "a-brand-new-password");
    expect(await isResetTokenValid(token)).toBe(false);
  });
});
