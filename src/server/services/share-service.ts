import { shareLinkRepository, projectRepository } from "../repositories/container";
import { getBriefForProject } from "./brief-service";
import { assertAgencyCanManageProject } from "./permissions";
import { ok, notFound, type ServiceResult } from "./result";
import { isShareLinkExpired, type ShareLink } from "../domain/share-link";
import type { SessionPayload } from "../auth/session";
import type { Project } from "../domain/project";
import type { BriefVersion } from "../domain/brief";

export interface GuestBriefView {
  project: Project;
  brief: BriefVersion;
}

/** Returns null for an unknown, expired, or brief-less token — callers should 404, not leak which case it was. */
export async function getGuestBriefView(token: string): Promise<GuestBriefView | null> {
  const link = await shareLinkRepository.findByToken(token);
  if (!link) return null;
  if (isShareLinkExpired(link, new Date())) return null;

  const project = await projectRepository.findById(link.projectId);
  if (!project) return null;

  const brief = await getBriefForProject(link.projectId);
  if (!brief) return null;

  return { project, brief };
}

/** Agency-only: lets staff retrieve the guest share link for a project (e.g. to copy and send it). */
export async function getShareLinkForProject(
  session: SessionPayload,
  projectId: string,
): Promise<ServiceResult<ShareLink>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<ShareLink>(session, project);
  if (denied) return denied;

  const link = await shareLinkRepository.findByProjectId(projectId);
  if (!link) return notFound("No share link exists for this project.");
  return ok(link);
}
