import type { AgencyRole, ClientRole } from "./user";

export type InviteKind = "team" | "client";

export const INVITE_TTL_HOURS = 72;

export interface Invite {
  id: string;
  /** Hashed (sha256) — the raw token is only ever in the email link, never stored. */
  tokenHash: string;
  kind: InviteKind;
  email: string;
  name: string;
  /** Set when kind is "team". */
  agencyRole?: AgencyRole;
  /** Set when kind is "client". */
  clientId?: string;
  clientRole?: ClientRole;
  invitedByUserId: string;
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
  /** One-time use — set once the invite has been accepted. */
  acceptedAt?: string;
}
