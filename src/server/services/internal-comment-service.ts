import { commentRepository, projectRepository } from "../repositories/container";
import { assertAgencyCanManageProject } from "./permissions";
import { ok, notFound, type ServiceResult } from "./result";
import type { SessionPayload } from "../auth/session";
import type { Comment } from "../domain/comment";

/** A16's "Team comments" — agency-only, never shown to the client. One thread per project (targetVersionId = projectId). */
export async function getInternalComments(projectId: string): Promise<Comment[]> {
  return commentRepository.listByTarget(projectId, "internal", projectId);
}

/** A15's Trello-style per-card comment badge — one count per project, for the whole board at once. */
export async function getInternalCommentCounts(projectIds: string[]): Promise<Record<string, number>> {
  const entries = await Promise.all(
    projectIds.map(async (id) => [id, (await getInternalComments(id)).length] as const),
  );
  return Object.fromEntries(entries);
}

export async function postInternalComment(
  session: SessionPayload,
  projectId: string,
  body: string,
): Promise<ServiceResult<Comment>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<Comment>(session, project);
  if (denied) return denied;

  const comment: Comment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId,
    targetType: "internal",
    targetVersionId: projectId,
    authorId: session.userId,
    authorName: session.name,
    body,
    createdAt: new Date().toISOString(),
  };
  await commentRepository.create(comment);
  return ok(comment);
}
