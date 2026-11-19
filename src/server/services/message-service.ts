import { projectMessageRepository, projectRepository } from "../repositories/container";
import { assertClientCanActOnProject, assertAgencyCanManageProject } from "./permissions";
import { ok, notFound, badRequest, type ServiceResult } from "./result";
import type { SessionPayload } from "../auth/session";
import type { ProjectMessage } from "../domain/message";

/** R10/R12 — per-project chat, read by both sides. Viewers can read (gated in the page, not here) but not post — see postProjectMessage. */
export async function getProjectMessages(projectId: string): Promise<ProjectMessage[]> {
  return projectMessageRepository.listByProjectId(projectId);
}

export async function postProjectMessage(
  session: SessionPayload,
  projectId: string,
  body: string,
): Promise<ServiceResult<ProjectMessage>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");

  const denied =
    session.role === "client"
      ? assertClientCanActOnProject<ProjectMessage>(session, project)
      : assertAgencyCanManageProject<ProjectMessage>(session, project);
  if (denied) return denied;

  if (!body.trim()) return badRequest("Write a message first.");

  const message: ProjectMessage = {
    id: `message-${projectId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId,
    authorId: session.userId,
    authorName: session.name,
    authorRole: session.role,
    body,
    createdAt: new Date().toISOString(),
  };
  await projectMessageRepository.create(message);
  return ok(message);
}
