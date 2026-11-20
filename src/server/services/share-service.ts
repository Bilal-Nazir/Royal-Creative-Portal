import { randomUUID } from "node:crypto";
import { shareLinkRepository, projectRepository } from "../repositories/container";
import { getBriefForProject } from "./brief-service";
import { getProposalForProject } from "./proposal-service";
import { assertAgencyCanManageProject } from "./permissions";
import { ok, notFound, type ServiceResult } from "./result";
import { isShareLinkExpired, type ShareLink } from "../domain/share-link";
import type { SessionPayload } from "../auth/session";
import type { Project } from "../domain/project";
import type { BriefVersion } from "../domain/brief";
import type { ProposalVersion } from "../domain/proposal";

export type GuestProjectView =
  | { kind: "brief"; project: Project; brief: BriefVersion }
  | { kind: "proposal"; project: Project; proposal: ProposalVersion };

/**
 * One guest link, one project — what it shows depends on how far the
 * project has got: the brief while it's still at the "brief" stage, the
 * proposal once it's moved past (approved brief, or a skipped one — see
 * DESIGN_NOTES). Returns null for an unknown, expired, or not-yet-ready
 * token — callers should 404, not leak which case it was.
 */
export async function getGuestProjectView(token: string): Promise<GuestProjectView | null> {
  const link = await shareLinkRepository.findByToken(token);
  if (!link) return null;
  if (isShareLinkExpired(link, new Date())) return null;

  const project = await projectRepository.findById(link.projectId);
  if (!project) return null;

  if (project.stage === "brief") {
    const brief = await getBriefForProject(link.projectId);
    if (!brief) return null;
    return { kind: "brief", project, brief };
  }

  const proposal = await getProposalForProject(link.projectId);
  if (!proposal) return null;
  return { kind: "proposal", project, proposal };
}

/** Agency-only: lets staff retrieve the guest share link for a project (e.g. to copy and send it), creating one on first request. */
export async function getShareLinkForProject(
  session: SessionPayload,
  projectId: string,
): Promise<ServiceResult<ShareLink>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<ShareLink>(session, project);
  if (denied) return denied;

  const existing = await shareLinkRepository.findByProjectId(projectId);
  if (existing) return ok(existing);

  const now = new Date();
  const expires = new Date(now);
  expires.setDate(expires.getDate() + 60);
  const link: ShareLink = {
    token: `share-${projectId}-${randomUUID()}`,
    projectId,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
  await shareLinkRepository.create(link);
  return ok(link);
}
