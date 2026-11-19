import { contentChecklistRepository, contentSubmissionRepository, projectRepository } from "../repositories/container";
import { assertAgencyCanManageProject, assertClientCanActOnProject } from "./permissions";
import { ok, badRequest, notFound, type ServiceResult } from "./result";
import { tryAdvanceStageIfGated } from "./stage-service";
import { notifyAgency } from "./notification-service";
import type { SessionPayload } from "../auth/session";
import type { ContentChecklistItem, ContentSubmission } from "../domain/content";
import type { Project } from "../domain/project";
import { getNextStage } from "../domain/stage";

export async function getContentChecklist(projectId: string): Promise<ContentChecklistItem[]> {
  return contentChecklistRepository.listByProjectId(projectId);
}

export async function getContentSubmissions(projectId: string): Promise<ContentSubmission[]> {
  return contentSubmissionRepository.listByProjectId(projectId);
}

/** C11 — the client sends files, a shared link and/or notes for one checklist item. */
export async function submitContentForItem(
  session: SessionPayload,
  projectId: string,
  checklistItemId: string,
  input: { fileIds: string[]; sharedLink?: string; notes?: string },
): Promise<ServiceResult<ContentSubmission>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertClientCanActOnProject<ContentSubmission>(session, project);
  if (denied) return denied;

  const item = await contentChecklistRepository.findById(checklistItemId);
  if (!item || item.projectId !== projectId) return notFound("Checklist item not found.");

  if (input.fileIds.length === 0 && !input.sharedLink && !input.notes) {
    return badRequest("Add a file, a shared link, or a note before submitting.");
  }

  const submission: ContentSubmission = {
    id: `content-submission-${checklistItemId}-${Date.now()}`,
    projectId,
    checklistItemId,
    fileIds: input.fileIds,
    sharedLink: input.sharedLink,
    notes: input.notes,
    submittedByName: session.name,
    submittedAt: new Date().toISOString(),
  };
  await contentSubmissionRepository.create(submission);
  await contentChecklistRepository.update({ ...item, status: "submitted" });
  await notifyAgency(projectId, "content_submitted", "Content submitted", `${session.name} submitted "${item.label}" for review.`);
  return ok(submission);
}

/** A09 — agency accepts a submission, or requests changes with a note. Accepting may satisfy the content -> design gate. */
export async function reviewContentSubmission(
  session: SessionPayload,
  projectId: string,
  submissionId: string,
  action: "accept" | "request_changes",
  note?: string,
): Promise<ServiceResult<ContentSubmission>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<ContentSubmission>(session, project);
  if (denied) return denied;

  const submission = await contentSubmissionRepository.findById(submissionId);
  if (!submission || submission.projectId !== projectId) return notFound("Submission not found.");

  const item = await contentChecklistRepository.findById(submission.checklistItemId);
  if (!item) return notFound("Checklist item not found.");

  const updatedSubmission: ContentSubmission = {
    ...submission,
    reviewedByName: session.name,
    reviewedAt: new Date().toISOString(),
    reviewNote: action === "request_changes" ? note : undefined,
  };
  await contentSubmissionRepository.update(updatedSubmission);
  await contentChecklistRepository.update({ ...item, status: action === "accept" ? "accepted" : "changes_requested" });

  if (action === "accept") await tryAdvanceStageIfGated(project);
  return ok(updatedSubmission);
}

/**
 * Decision: an admin/owner (or the assigned member) can force content -> design
 * even if required items are still outstanding. The force is recorded on the
 * project with who did it and when.
 */
export async function forceAdvanceContentToDesign(
  session: SessionPayload,
  projectId: string,
): Promise<ServiceResult<Project>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<Project>(session, project);
  if (denied) return denied;

  if (project.stage !== "content") {
    return badRequest(`Can only force-advance from "content" — project is currently at "${project.stage}".`);
  }

  const nextStage = getNextStage(project.stage);
  if (!nextStage) return badRequest("No next stage to advance to.");

  const updated: Project = {
    ...project,
    stage: nextStage,
    forcedAdvances: [
      ...project.forcedAdvances,
      { stage: nextStage, byUserId: session.userId, byUserName: session.name, at: new Date().toISOString() },
    ],
  };
  await projectRepository.update(updated);
  return ok(updated);
}
