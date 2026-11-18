import type { SessionPayload } from "../auth/session";
import type { Project } from "../domain/project";
import { forbidden, type ServiceResult } from "./result";

/** Whether this session is allowed to take actions (approve, pay, submit) rather than just view. */
export function canAct(session: SessionPayload): boolean {
  if (session.role === "client") return session.clientRole === "participant";
  return true;
}

/** Agency members only see projects assigned to them; owners/admins see everything. */
export function filterProjectsForAgencyUser(session: SessionPayload, allProjects: Project[]): Project[] {
  if (session.role !== "agency") return [];
  if (session.agencyRole === "owner" || session.agencyRole === "admin") return allProjects;
  return allProjects.filter((p) => p.assigneeId === session.userId);
}

/**
 * Gate for every brief/proposal/invoice action (approve, request changes, pay,
 * comment). Enforced in services, not just hidden in the UI — a viewer or a
 * client on a different project gets a 403 ServiceResult, not just a
 * disabled button.
 */
export function assertClientCanActOnProject<T>(session: SessionPayload, project: Project): ServiceResult<T> | null {
  if (session.role !== "client") {
    return forbidden("Only the client on this project can do that.");
  }
  if (project.clientId !== session.clientId) {
    return forbidden("You don't have access to this project.");
  }
  if (session.clientRole !== "participant") {
    return forbidden("Viewers can't take actions on this project.");
  }
  return null;
}

/** Gate for agency-only actions (e.g. force-advancing a stage). Members are restricted to their own assigned projects. */
export function assertAgencyCanManageProject<T>(session: SessionPayload, project: Project): ServiceResult<T> | null {
  if (session.role !== "agency") {
    return forbidden("Only agency staff can do that.");
  }
  if (session.agencyRole === "owner" || session.agencyRole === "admin") {
    return null;
  }
  if (project.assigneeId !== session.userId) {
    return forbidden("You're not assigned to this project.");
  }
  return null;
}
