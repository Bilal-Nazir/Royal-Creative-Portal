import {
  designVersionRepository,
  designPinCommentRepository,
  revisionRoundRepository,
  proposalRepository,
  projectRepository,
} from "../repositories/container";
import { assertClientCanActOnProject, assertAgencyCanManageProject } from "./permissions";
import { ok, badRequest, notFound, type ServiceResult } from "./result";
import { tryAdvanceStageIfGated } from "./stage-service";
import { notifyClient, notifyAgency, notifyAssignee } from "./notification-service";
import { isOverRevisionAllowance, PIN_TITLE_MAX_LENGTH } from "../domain/design";
import type { SessionPayload } from "../auth/session";
import type { DesignVersion, DesignPinComment, RevisionRound, PinCommentStatus, RevisionRoundWorkflowStatus } from "../domain/design";

export async function getDesignVersions(projectId: string): Promise<DesignVersion[]> {
  return designVersionRepository.listByProjectId(projectId);
}

export async function getCurrentDesignVersion(projectId: string): Promise<DesignVersion | null> {
  return designVersionRepository.getCurrentVersion(projectId);
}

export async function getRevisionRounds(projectId: string): Promise<RevisionRound[]> {
  return revisionRoundRepository.listByProjectId(projectId);
}

/**
 * Submitted pins are visible to everyone; drafts are private to their
 * author until a revision round submits them together — so a second
 * client participant never sees someone else's half-written feedback.
 */
export async function getPinCommentsForVersion(versionId: string, viewerUserId: string): Promise<DesignPinComment[]> {
  const comments = await designPinCommentRepository.listByVersionId(versionId);
  return comments.filter((c) => !c.isDraft || c.authorId === viewerUserId);
}

export interface ShareDesignVersionInput {
  figmaLink: string;
  screenshotFileIds: string[];
  message?: string;
  whatChanged?: string;
  respondsToRoundId?: string;
}

/** A10 (version 1) and R05 (version 2+) — both create the next version; R05 additionally sets whatChanged/respondsToRoundId. */
export async function shareDesignVersion(
  session: SessionPayload,
  projectId: string,
  input: ShareDesignVersionInput,
): Promise<ServiceResult<DesignVersion>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<DesignVersion>(session, project);
  if (denied) return denied;

  if (input.screenshotFileIds.length === 0) {
    return badRequest("At least one review screenshot is required.");
  }

  const current = await designVersionRepository.getCurrentVersion(projectId);
  if (current) {
    await designVersionRepository.update({ ...current, status: "superseded" });
  }

  const version: DesignVersion = {
    id: `design-${projectId}-v${(current?.versionNumber ?? 0) + 1}`,
    projectId,
    versionNumber: (current?.versionNumber ?? 0) + 1,
    figmaLink: input.figmaLink,
    screenshotFileIds: input.screenshotFileIds,
    message: input.message,
    whatChanged: input.whatChanged,
    respondsToRoundId: input.respondsToRoundId,
    createdByName: session.name,
    createdAt: new Date().toISOString(),
    status: "shared",
  };
  await designVersionRepository.create(version);
  await notifyClient(projectId, "design_shared", "Design shared", `${session.name} shared Version ${version.versionNumber} for review.`);
  return ok(version);
}

/** C12/R01 — drops a numbered pin at a percentage position on the current version's screenshot, as a draft comment. */
export async function createPinComment(
  session: SessionPayload,
  projectId: string,
  versionId: string,
  input: { xPercent: number; yPercent: number; body: string; title?: string },
): Promise<ServiceResult<DesignPinComment>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertClientCanActOnProject<DesignPinComment>(session, project);
  if (denied) return denied;

  const version = await designVersionRepository.findById(versionId);
  if (!version || version.projectId !== projectId) return notFound("Design version not found.");

  if (input.xPercent < 0 || input.xPercent > 100 || input.yPercent < 0 || input.yPercent > 100) {
    return badRequest("Pin position must be a percentage between 0 and 100.");
  }
  if (!input.body.trim()) return badRequest("Add a comment for this pin.");
  const title = input.title?.trim() || undefined;
  if (title && title.length > PIN_TITLE_MAX_LENGTH) {
    return badRequest(`Pin title must be ${PIN_TITLE_MAX_LENGTH} characters or fewer.`);
  }

  const existing = await designPinCommentRepository.listByVersionId(versionId);
  const comment: DesignPinComment = {
    id: `pin-${versionId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    projectId,
    designVersionId: versionId,
    number: existing.length + 1,
    xPercent: input.xPercent,
    yPercent: input.yPercent,
    title,
    body: input.body,
    isDraft: true,
    authorId: session.userId,
    authorName: session.name,
    createdAt: new Date().toISOString(),
    status: "open",
  };
  await designPinCommentRepository.create(comment);
  return ok(comment);
}

/** R02/R13 — every draft pin the client authored on this version is submitted together as the next revision round. */
export async function submitRevisionRound(
  session: SessionPayload,
  projectId: string,
  versionId: string,
): Promise<ServiceResult<RevisionRound>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertClientCanActOnProject<RevisionRound>(session, project);
  if (denied) return denied;

  const version = await designVersionRepository.findById(versionId);
  if (!version || version.projectId !== projectId) return notFound("Design version not found.");

  const allComments = await designPinCommentRepository.listByVersionId(versionId);
  const draftComments = allComments.filter((c) => c.isDraft && c.authorId === session.userId);
  if (draftComments.length === 0) return badRequest("Add at least one comment before submitting a revision round.");

  const existingRounds = await revisionRoundRepository.listByProjectId(projectId);
  const roundNumber = existingRounds.length + 1;

  const proposal = await proposalRepository.getCurrentVersion(projectId);
  const includedRevisionRounds = proposal?.includedRevisionRounds ?? 0;

  const round: RevisionRound = {
    id: `revision-round-${projectId}-${roundNumber}`,
    projectId,
    designVersionId: versionId,
    roundNumber,
    commentIds: draftComments.map((c) => c.id),
    submittedByName: session.name,
    submittedAt: new Date().toISOString(),
    workflowStatus: "submitted",
    overAllowance: isOverRevisionAllowance(roundNumber, includedRevisionRounds),
  };
  await revisionRoundRepository.create(round);

  for (const comment of draftComments) {
    await designPinCommentRepository.update({ ...comment, isDraft: false });
  }

  await notifyAgency(
    projectId,
    "revision_round_submitted",
    "Revision round submitted",
    `${session.name} submitted Revision round ${roundNumber} (${draftComments.length} comments) on Version ${version.versionNumber}.`,
  );
  return ok(round);
}

/** R07 — records the approver, timestamp and version, then the design -> development gate (computed in stage-service) is satisfied. */
export async function approveDesignVersion(
  session: SessionPayload,
  projectId: string,
  versionId: string,
): Promise<ServiceResult<DesignVersion>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertClientCanActOnProject<DesignVersion>(session, project);
  if (denied) return denied;

  const version = await designVersionRepository.findById(versionId);
  if (!version || version.projectId !== projectId) return notFound("Design version not found.");

  const updated: DesignVersion = {
    ...version,
    status: "approved",
    approvedByUserId: session.userId,
    approvedByName: session.name,
    approvedAt: new Date().toISOString(),
  };
  await designVersionRepository.update(updated);
  await notifyAgency(projectId, "design_approved", "Design approved", `${session.name} approved Version ${version.versionNumber}.`);
  await tryAdvanceStageIfGated(project);
  return ok(updated);
}

/** R04 — agency-only tracking fields on a revision round: assignee, target date, overall workflow status. */
export async function updateRevisionRoundTracking(
  session: SessionPayload,
  projectId: string,
  roundId: string,
  input: { assigneeId?: string; assigneeName?: string; targetDate?: string; workflowStatus?: RevisionRoundWorkflowStatus },
): Promise<ServiceResult<RevisionRound>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<RevisionRound>(session, project);
  if (denied) return denied;

  const round = await revisionRoundRepository.findById(roundId);
  if (!round || round.projectId !== projectId) return notFound("Revision round not found.");

  const updated: RevisionRound = {
    ...round,
    assigneeId: input.assigneeId ?? round.assigneeId,
    assigneeName: input.assigneeName ?? round.assigneeName,
    targetDate: input.targetDate ?? round.targetDate,
    workflowStatus: input.workflowStatus ?? round.workflowStatus,
  };
  await revisionRoundRepository.update(updated);

  // Only on an actual (re-)assignment, not every tracking edit, so clicking
  // "Update revision status" with the same assignee doesn't re-notify them.
  if (input.assigneeId && input.assigneeId !== round.assigneeId) {
    await notifyAssignee(
      projectId,
      input.assigneeId,
      "Revision round assigned",
      `You were assigned Round ${round.roundNumber} on ${project.name}.`,
    );
  }
  return ok(updated);
}

/** R04 — per-comment status within a round (open / in_progress / resolved), independent of the round's overall workflow status. */
export async function setPinCommentStatus(
  session: SessionPayload,
  projectId: string,
  pinId: string,
  status: PinCommentStatus,
): Promise<ServiceResult<DesignPinComment>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<DesignPinComment>(session, project);
  if (denied) return denied;

  const comment = await designPinCommentRepository.findById(pinId);
  if (!comment || comment.projectId !== projectId) return notFound("Comment not found.");

  const updated: DesignPinComment = { ...comment, status };
  await designPinCommentRepository.update(updated);
  return ok(updated);
}

/** R04's "Scope review" — flags (never blocks) a round that exceeds the proposal's included revision rounds, for a separate scope decision. */
export async function flagRevisionRoundForScope(
  session: SessionPayload,
  projectId: string,
  roundId: string,
): Promise<ServiceResult<RevisionRound>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<RevisionRound>(session, project);
  if (denied) return denied;

  const round = await revisionRoundRepository.findById(roundId);
  if (!round || round.projectId !== projectId) return notFound("Revision round not found.");
  if (!round.overAllowance) return badRequest("This round is within the agreed revision allowance — nothing to flag.");

  const updated: RevisionRound = { ...round, scopeFlaggedAt: new Date().toISOString() };
  await revisionRoundRepository.update(updated);
  return ok(updated);
}
