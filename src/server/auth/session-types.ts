import { z } from "zod";
import type { AgencyRole, ClientRole } from "../domain/user";

export const SESSION_COOKIE_NAME = "rc_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours — also the sliding-expiry window, refreshed on every verify()

export const sessionPayloadSchema = z.discriminatedUnion("role", [
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

/** Behind an interface so the storage driver (Redis, DynamoDB) can change without touching middleware, route handlers, or UI code that depends on SessionService. */
export interface SessionService {
  create(payload: SessionPayload): Promise<string>;
  verify(token: string): Promise<SessionPayload | null>;
  /** Logout — deletes this one session. */
  destroy(token: string): Promise<void>;
  /** Password change or role change — deletes every session belonging to this user, everywhere they're signed in. */
  revokeAllForUser(userId: string): Promise<void>;
}
