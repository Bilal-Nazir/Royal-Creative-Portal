import { briefRepository, commentRepository, projectRepository } from "../repositories/container";
import { assertClientCanActOnProject, assertAgencyCanManageProject } from "./permissions";
import { ok, notFound, type ServiceResult } from "./result";
import { tryAdvanceStageIfGated } from "./stage-service";
import type { SessionPayload } from "../auth/session";
import type { BriefVersion, BriefFields } from "../domain/brief";
import type { Comment } from "../domain/comment";

export async function getBriefForProject(projectId: string): Promise<BriefVersion | null> {
  return briefRepository.getCurrentVersion(projectId);
}

export async function getBriefComments(projectId: string, versionId: string): Promise<Comment[]> {
  return commentRepository.listByTarget(projectId, "brief", versionId);
}

export async function approveBrief(session: SessionPayload, projectId: string): Promise<ServiceResult<BriefVersion>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertClientCanActOnProject<BriefVersion>(session, project);
  if (denied) return denied;

  const brief = await briefRepository.getCurrentVersion(projectId);
  if (!brief) return notFound("Brief not found.");

  const updated: BriefVersion = {
    ...brief,
    status: "approved",
    approvedByUserId: session.userId,
    approvedByName: session.name,
    approvedAt: new Date().toISOString(),
  };
  await briefRepository.update(updated);
  await tryAdvanceStageIfGated(project);
  return ok(updated);
}

export async function requestBriefRevisions(
  session: SessionPayload,
  projectId: string,
  text: string,
  attachmentUrl?: string,
): Promise<ServiceResult<BriefVersion>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertClientCanActOnProject<BriefVersion>(session, project);
  if (denied) return denied;

  const brief = await briefRepository.getCurrentVersion(projectId);
  if (!brief) return notFound("Brief not found.");

  // Decision: this keeps the same version — it does not bump versionNumber.
  const updated: BriefVersion = {
    ...brief,
    status: "changes_requested",
    revisionRequestedText: text,
    revisionRequestedAttachmentUrl: attachmentUrl,
    revisionRequestedAt: new Date().toISOString(),
  };
  await briefRepository.update(updated);
  return ok(updated);
}

/** Agency-only: responds to a changes_requested brief with a new, sent version. */
export async function sendRevisedBrief(
  session: SessionPayload,
  projectId: string,
  fields: BriefFields,
): Promise<ServiceResult<BriefVersion>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<BriefVersion>(session, project);
  if (denied) return denied;

  const current = await briefRepository.getCurrentVersion(projectId);
  if (!current) return notFound("Brief not found.");

  const revised: BriefVersion = {
    id: `brief-${projectId}-v${current.versionNumber + 1}`,
    projectId,
    versionNumber: current.versionNumber + 1,
    fields,
    status: "sent",
    createdByName: session.name,
    createdAt: new Date().toISOString(),
  };
  await briefRepository.create(revised);
  return ok(revised);
}

/**
 * A05's "Save brief draft" / "Send brief for review" actions. Unlike
 * sendRevisedBrief (which always creates a new version, for responding to
 * changes_requested), these are draft-aware: while the current version is
 * still a draft, edits update it in place; once it's been sent, a save/send
 * starts a new version so the sent copy the client is viewing is untouched.
 */
export async function saveBriefDraft(
  session: SessionPayload,
  projectId: string,
  fields: BriefFields,
): Promise<ServiceResult<BriefVersion>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<BriefVersion>(session, project);
  if (denied) return denied;

  const current = await briefRepository.getCurrentVersion(projectId);
  if (current && current.status === "draft") {
    const updated: BriefVersion = { ...current, fields };
    await briefRepository.update(updated);
    return ok(updated);
  }

  const draft: BriefVersion = {
    id: `brief-${projectId}-v${(current?.versionNumber ?? 0) + 1}`,
    projectId,
    versionNumber: (current?.versionNumber ?? 0) + 1,
    fields,
    status: "draft",
    createdByName: session.name,
    createdAt: new Date().toISOString(),
  };
  await briefRepository.create(draft);
  return ok(draft);
}

export async function sendBriefForReview(
  session: SessionPayload,
  projectId: string,
  fields: BriefFields,
): Promise<ServiceResult<BriefVersion>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<BriefVersion>(session, project);
  if (denied) return denied;

  const current = await briefRepository.getCurrentVersion(projectId);
  if (current && current.status === "draft") {
    const updated: BriefVersion = { ...current, fields, status: "sent" };
    await briefRepository.update(updated);
    return ok(updated);
  }

  const sent: BriefVersion = {
    id: `brief-${projectId}-v${(current?.versionNumber ?? 0) + 1}`,
    projectId,
    versionNumber: (current?.versionNumber ?? 0) + 1,
    fields,
    status: "sent",
    createdByName: session.name,
    createdAt: new Date().toISOString(),
  };
  await briefRepository.create(sent);
  return ok(sent);
}

export async function postBriefComment(
  session: SessionPayload,
  projectId: string,
  body: string,
): Promise<ServiceResult<Comment>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertClientCanActOnProject<Comment>(session, project);
  if (denied) return denied;

  const brief = await briefRepository.getCurrentVersion(projectId);
  if (!brief) return notFound("Brief not found.");

  const comment: Comment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId,
    targetType: "brief",
    targetVersionId: brief.id,
    authorId: session.userId,
    authorName: session.name,
    body,
    createdAt: new Date().toISOString(),
  };
  await commentRepository.create(comment);
  return ok(comment);
}
