export const PASSWORD_RESET_TTL_HOURS = 1;

export interface PasswordResetToken {
  id: string;
  /** Hashed (sha256) — the raw token is only ever in the email link, never stored. */
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  /** One-time use — set once the token has been used. */
  usedAt?: string;
}
