import { contentChecklistRepository, projectRepository } from "../repositories/container";
import { assertAgencyCanManageProject } from "./permissions";
import { ok, badRequest, notFound, type ServiceResult } from "./result";
import type { SessionPayload } from "../auth/session";
import type { ContentChecklistItem } from "../domain/content";
import type { Project } from "../domain/project";
import { getNextStage } from "../domain/stage";

export async function getContentChecklist(projectId: string): Promise<ContentChecklistItem[]> {
  return contentChecklistRepository.listByProjectId(projectId);
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
