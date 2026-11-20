import { briefRepository, commentRepository, projectRepository } from "../repositories/container";
import { assertClientCanActOnProject, assertAgencyCanManageProject } from "./permissions";
import { ok, notFound, forbidden, badRequest, type ServiceResult } from "./result";
import { tryAdvanceStageIfGated } from "./stage-service";
import type { SessionPayload } from "../auth/session";
import type { BriefVersion, BriefFields } from "../domain/brief";
import type { Comment } from "../domain/comment";
import type { Project } from "../domain/project";

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

/**
 * A16's "Skip brief" action — owner/admin only (stricter than
 * assertAgencyCanManageProject, which also lets an assigned member through),
 * and only while the brief is still a draft (or hasn't been created yet):
 * once it's been sent, changes_requested, or approved, it can no longer be
 * skipped. Moves the project straight to "proposal" — the same place
 * approveBrief's tryAdvanceStageIfGated would land it.
 */
export async function skipBrief(session: SessionPayload, projectId: string): Promise<ServiceResult<BriefVersion>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  if (session.role !== "agency") return forbidden("Only agency staff can do that.");
  if (session.agencyRole !== "owner" && session.agencyRole !== "admin") {
    return forbidden("Only an owner or admin can skip the brief.");
  }
  if (project.stage !== "brief") {
    return badRequest(`Can only skip the brief from the "brief" stage — project is currently at "${project.stage}".`);
  }

  const current = await briefRepository.getCurrentVersion(projectId);
  if (current && current.status !== "draft") {
    return badRequest(`Can't skip a brief that's already "${current.status}".`);
  }

  const now = new Date().toISOString();
  const skipped: BriefVersion = current
    ? { ...current, status: "skipped", skippedByUserId: session.userId, skippedByName: session.name, skippedAt: now }
    : {
        id: `brief-${projectId}-v1`,
        projectId,
        versionNumber: 1,
        fields: { objective: "", audience: "", pages: "", features: "", deliverables: "" },
        status: "skipped",
        createdByName: session.name,
        createdAt: now,
        skippedByUserId: session.userId,
        skippedByName: session.name,
        skippedAt: now,
      };
  if (current) await briefRepository.update(skipped);
  else await briefRepository.create(skipped);

  const updated: Project = {
    ...project,
    stage: "proposal",
    statusLabel: "Proposal in progress",
    clientStatusLabel: "In progress",
    nextMilestone: { label: "Proposal review", date: project.dueDate, waitingOn: "agency" },
  };
  await projectRepository.update(updated);

  return ok(skipped);
}
