import { createHash, randomBytes } from "node:crypto";
import { inviteRepository, userRepository } from "../repositories/container";
import { hashPasswordSecure } from "../auth/password";
import { emailProvider } from "../email/email-provider";
import { env } from "../env";
import { ok, forbidden, notFound, badRequest, type ServiceResult } from "./result";
import type { SessionPayload } from "../auth/session";
import type { Invite, InviteKind } from "../domain/invite";
import type { AgencyRole, AgencyUser, ClientRole, ClientUser, User } from "../domain/user";
import { INVITE_TTL_HOURS } from "../domain/invite";

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function generateRawToken(): string {
  return randomBytes(32).toString("base64url");
}

function assertOwnerOrAdmin<T>(session: SessionPayload): ServiceResult<T> | null {
  if (session.role !== "agency") return forbidden("Only agency staff can send invites.");
  if (session.agencyRole !== "owner" && session.agencyRole !== "admin") {
    return forbidden("Only the owner or an admin can send invites.");
  }
  return null;
}

export interface InviteTeamMemberInput {
  name: string;
  email: string;
  agencyRole: AgencyRole;
}

/** A20 "Invite" — creates a pending Invite and emails the accept link, rather than the user directly with a temporary password. */
export async function inviteTeamMember(session: SessionPayload, input: InviteTeamMemberInput): Promise<ServiceResult<Invite>> {
  const denied = assertOwnerOrAdmin<Invite>(session);
  if (denied) return denied;

  const existing = await userRepository.findByEmail(input.email);
  if (existing) return badRequest("Someone with that email already exists.");

  return createInvite(session, "team", {
    name: input.name,
    email: input.email,
    agencyRole: input.agencyRole,
  });
}

export interface InviteClientInput {
  name: string;
  email: string;
  clientId: string;
  clientRole?: ClientRole;
}

/** A project/contact's "Invite client" — same token flow, scoped to a clientId/clientRole instead of an agencyRole. */
export async function inviteClient(session: SessionPayload, input: InviteClientInput): Promise<ServiceResult<Invite>> {
  if (session.role !== "agency") return forbidden("Only agency staff can send invites.");

  const existing = await userRepository.findByEmail(input.email);
  if (existing) return badRequest("Someone with that email already exists.");

  return createInvite(session, "client", {
    name: input.name,
    email: input.email,
    clientId: input.clientId,
    clientRole: input.clientRole ?? "participant",
  });
}

async function createInvite(
  session: SessionPayload,
  kind: InviteKind,
  fields: Pick<Invite, "name" | "email" | "agencyRole" | "clientId" | "clientRole">,
): Promise<ServiceResult<Invite>> {
  const rawToken = generateRawToken();
  const now = new Date();
  const expires = new Date(now.getTime() + INVITE_TTL_HOURS * 60 * 60 * 1000);

  const invite: Invite = {
    id: `invite-${now.getTime().toString(36)}-${randomBytes(4).toString("hex")}`,
    tokenHash: hashToken(rawToken),
    kind,
    ...fields,
    invitedByUserId: session.userId,
    invitedByName: session.name,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
  await inviteRepository.create(invite);

  const link = `${env.APP_URL}/invite/${rawToken}`;
  await emailProvider.send({
    to: fields.email,
    subject: "You've been invited to Royal Creative",
    body: `${session.name} invited you to join Royal Creative. Set your password here (expires in ${INVITE_TTL_HOURS} hours):\n${link}`,
  });

  return ok(invite);
}

export interface AcceptInviteResult {
  email: string;
}

/** /invite/[token] — validates the (hashed, expiring, one-time) token and creates the real user. Does not sign them in; they sign in afterward. */
export async function acceptInvite(rawToken: string, password: string): Promise<ServiceResult<AcceptInviteResult>> {
  if (password.length < 8) return badRequest("Password must be at least 8 characters.");

  const invite = await inviteRepository.findByTokenHash(hashToken(rawToken));
  if (!invite) return notFound("This invite link isn't valid.");
  if (invite.acceptedAt) return badRequest("This invite has already been used.");
  if (new Date(invite.expiresAt).getTime() < Date.now()) return badRequest("This invite link has expired.");

  const existing = await userRepository.findByEmail(invite.email);
  if (existing) return badRequest("Someone with that email already exists.");

  const passwordHash = await hashPasswordSecure(password);
  const id = `u-${invite.email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase()}-${Date.now().toString(36)}`;

  const user: User =
    invite.kind === "team"
      ? ({ id, role: "agency", agencyRole: invite.agencyRole as AgencyRole, name: invite.name, email: invite.email, passwordHash } as AgencyUser)
      : ({
          id,
          role: "client",
          clientRole: invite.clientRole as ClientRole,
          clientId: invite.clientId as string,
          name: invite.name,
          email: invite.email,
          passwordHash,
        } as ClientUser);

  await userRepository.create(user);
  await inviteRepository.update({ ...invite, acceptedAt: new Date().toISOString() });

  return ok({ email: invite.email });
}

/** For the /invite/[token] page itself — shown before the password is set, so it can greet them and detect an already-expired/used link without exposing anything else. */
export async function getInviteByToken(rawToken: string): Promise<Pick<Invite, "name" | "email" | "kind"> | null> {
  const invite = await inviteRepository.findByTokenHash(hashToken(rawToken));
  if (!invite || invite.acceptedAt || new Date(invite.expiresAt).getTime() < Date.now()) return null;
  return { name: invite.name, email: invite.email, kind: invite.kind };
}
