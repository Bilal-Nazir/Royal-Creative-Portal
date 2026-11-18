import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import type { AgencyRole, ClientRole } from "../domain/user";

export const SESSION_COOKIE_NAME = "rc_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

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

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is not set. Add it to .env.local.");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Behind an interface so a real auth provider (and a real database behind
 * it) can replace this jose/JWT implementation later without touching
 * middleware, route handlers, or UI code that depends on SessionService.
 */
export interface SessionService {
  create(payload: SessionPayload): Promise<string>;
  verify(token: string): Promise<SessionPayload | null>;
}

class JoseSessionService implements SessionService {
  async create(payload: SessionPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
      .sign(getSecretKey());
  }

  async verify(token: string): Promise<SessionPayload | null> {
    try {
      const { payload } = await jwtVerify(token, getSecretKey());
      const result = sessionPayloadSchema.safeParse(payload);
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }
}

export const sessionService: SessionService = new JoseSessionService();
