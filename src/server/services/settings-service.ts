import { agencySettingsRepository, userRepository } from "../repositories/container";
import { hashPassword } from "../auth/password";
import { ok, forbidden, notFound, badRequest, type ServiceResult } from "./result";
import type { SessionPayload } from "../auth/session";
import type { AgencySettings } from "../domain/settings";
import type { AgencyUser, AgencyRole } from "../domain/user";

function assertOwnerOrAdmin<T>(session: SessionPayload): ServiceResult<T> | null {
  if (session.role !== "agency") return forbidden("Only agency staff can manage settings.");
  if (session.agencyRole !== "owner" && session.agencyRole !== "admin") {
    return forbidden("Only the owner or an admin can manage settings.");
  }
  return null;
}

export async function getAgencySettings(): Promise<AgencySettings> {
  return agencySettingsRepository.get();
}

export async function updateAgencySettings(
  session: SessionPayload,
  patch: Partial<AgencySettings>,
): Promise<ServiceResult<AgencySettings>> {
  const denied = assertOwnerOrAdmin<AgencySettings>(session);
  if (denied) return denied;

  const current = await agencySettingsRepository.get();
  const updated: AgencySettings = {
    ...current,
    ...patch,
    notifications: { ...current.notifications, ...patch.notifications },
  };
  await agencySettingsRepository.update(updated);
  return ok(updated);
}

/** A20 Team & access list — every agency user, any role can view it, only owner/admin can change it (checked in each action below). */
export async function listTeam(): Promise<AgencyUser[]> {
  const users = await userRepository.listAgencyUsers();
  return users.filter((u): u is AgencyUser => u.role === "agency");
}

export interface InviteTeamMemberInput {
  name: string;
  email: string;
  agencyRole: AgencyRole;
}

/** "Invite" just creates the user directly — no email flow in this phase. A temporary password is generated; there's no reset/first-login flow yet. */
export async function inviteTeamMember(session: SessionPayload, input: InviteTeamMemberInput): Promise<ServiceResult<AgencyUser>> {
  const denied = assertOwnerOrAdmin<AgencyUser>(session);
  if (denied) return denied;

  const existing = await userRepository.findByEmail(input.email);
  if (existing) return badRequest("Someone with that email already exists.");

  const temporaryPassword = Math.random().toString(36).slice(2, 10);
  const user: AgencyUser = {
    id: `u-${input.email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase()}-${Date.now().toString(36)}`,
    role: "agency",
    agencyRole: input.agencyRole,
    name: input.name,
    email: input.email,
    passwordHash: hashPassword(temporaryPassword),
  };
  await userRepository.create(user);
  return ok(user);
}

/** Only the owner can change roles (not even an admin) — explicit requirement, stricter than the invite/remove gate above. */
export async function changeTeamMemberRole(
  session: SessionPayload,
  userId: string,
  agencyRole: AgencyRole,
): Promise<ServiceResult<AgencyUser>> {
  if (session.role !== "agency" || session.agencyRole !== "owner") {
    return forbidden("Only the owner can change roles.");
  }
  const user = await userRepository.findById(userId);
  if (!user || user.role !== "agency") return notFound("Team member not found.");

  if (user.agencyRole === "owner" && agencyRole !== "owner") {
    const team = await listTeam();
    if (team.filter((u) => u.agencyRole === "owner").length <= 1) {
      return badRequest("There must be at least one owner.");
    }
  }

  const updated: AgencyUser = { ...user, agencyRole };
  await userRepository.update(updated);
  return ok(updated);
}

export async function removeTeamMember(session: SessionPayload, userId: string): Promise<ServiceResult<null>> {
  const denied = assertOwnerOrAdmin<null>(session);
  if (denied) return denied;
  if (session.userId === userId) return badRequest("You can't remove yourself.");

  const user = await userRepository.findById(userId);
  if (!user || user.role !== "agency") return notFound("Team member not found.");
  if (user.agencyRole === "owner") {
    const team = await listTeam();
    if (team.filter((u) => u.agencyRole === "owner").length <= 1) {
      return badRequest("There must be at least one owner.");
    }
  }

  await userRepository.remove(userId);
  return ok(null);
}
