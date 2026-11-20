import { createHash, randomBytes } from "node:crypto";
import { passwordResetTokenRepository, userRepository } from "../repositories/container";
import { hashPasswordSecure } from "../auth/password";
import { sessionService } from "../auth/session";
import { emailProvider } from "../email/email-provider";
import { env } from "../env";
import { ok, badRequest, type ServiceResult } from "./result";
import { PASSWORD_RESET_TTL_HOURS, type PasswordResetToken } from "../domain/password-reset";

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Always returns ok — never reveals whether the email exists. If it does,
 * a reset email goes out; if it doesn't, this is a silent no-op that looks
 * identical to the caller either way.
 */
export async function requestPasswordReset(email: string): Promise<ServiceResult<null>> {
  const user = await userRepository.findByEmail(email);
  if (!user) return ok(null);

  const rawToken = randomBytes(32).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + PASSWORD_RESET_TTL_HOURS * 60 * 60 * 1000);

  const token: PasswordResetToken = {
    id: `pwreset-${now.getTime().toString(36)}-${randomBytes(4).toString("hex")}`,
    tokenHash: hashToken(rawToken),
    userId: user.id,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
  await passwordResetTokenRepository.create(token);

  const link = `${env.APP_URL}/reset-password/${rawToken}`;
  await emailProvider.send({
    to: user.email,
    subject: "Reset your Royal Creative password",
    body: `Reset your password here (expires in ${PASSWORD_RESET_TTL_HOURS} hour):\n${link}\n\nIf you didn't request this, you can ignore this email.`,
  });

  return ok(null);
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<ServiceResult<null>> {
  if (newPassword.length < 8) return badRequest("Password must be at least 8 characters.");

  const token = await passwordResetTokenRepository.findByTokenHash(hashToken(rawToken));
  if (!token) return badRequest("This reset link isn't valid.");
  if (token.usedAt) return badRequest("This reset link has already been used.");
  if (new Date(token.expiresAt).getTime() < Date.now()) return badRequest("This reset link has expired.");

  const user = await userRepository.findById(token.userId);
  if (!user) return badRequest("This reset link isn't valid.");

  const passwordHash = await hashPasswordSecure(newPassword);
  await userRepository.update({ ...user, passwordHash });
  await passwordResetTokenRepository.update({ ...token, usedAt: new Date().toISOString() });
  await sessionService.revokeAllForUser(user.id);

  return ok(null);
}

/** For the /reset-password/[token] page — true only if the token is still usable, without exposing anything about the account it belongs to. */
export async function isResetTokenValid(rawToken: string): Promise<boolean> {
  const token = await passwordResetTokenRepository.findByTokenHash(hashToken(rawToken));
  if (!token) return false;
  if (token.usedAt) return false;
  return new Date(token.expiresAt).getTime() >= Date.now();
}
