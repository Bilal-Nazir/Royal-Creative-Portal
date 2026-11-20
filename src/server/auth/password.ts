import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";

const KEY_LENGTH = 64;

/**
 * Kept exactly as-is (scrypt, sync) — the memory driver's seed data hashes
 * SEED_PASSWORD at module load time (seed-data.ts), which needs a sync call.
 * `verifyPassword` below still accepts this format, so this is purely the
 * test/seed-data path now; every real (Mongo-backed) password goes through
 * `hashPasswordSecure` (argon2) instead — see db:seed and the invite/reset
 * flows in auth-service.ts.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

/** argon2id — used for every password set via the real auth flows (db:seed, invite accept, password reset). */
export async function hashPasswordSecure(password: string): Promise<string> {
  return argon2.hash(password);
}

/** Dispatches on the stored hash's format so both the legacy scrypt (seed/memory-driver) and argon2 (real) formats verify correctly through the one call site in auth-service.ts. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("$argon2")) {
    try {
      return await argon2.verify(stored, password);
    } catch {
      return false;
    }
  }
  const [salt, derivedHex] = stored.split(":");
  if (!salt || !derivedHex) return false;
  const derived = scryptSync(password, salt, KEY_LENGTH);
  const stored_ = Buffer.from(derivedHex, "hex");
  if (derived.length !== stored_.length) return false;
  return timingSafeEqual(derived, stored_);
}
