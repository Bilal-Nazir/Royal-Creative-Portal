import { projectMessageRepository, projectRepository, conversationReadRepository } from "../repositories/container";
import { assertClientCanActOnProject, assertAgencyCanManageProject, filterProjectsForAgencyUser } from "./permissions";
import { ok, notFound, forbidden, badRequest, type ServiceResult } from "./result";
import type { SessionPayload } from "../auth/session";
import type { ProjectMessage } from "../domain/message";
import type { Project } from "../domain/project";

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

/** A29/A15 — every project this session can message on, newest conversation first. Members only see their assigned projects. */
async function projectsVisibleTo(session: SessionPayload): Promise<Project[]> {
  const all = await projectRepository.listAll();
  if (session.role === "client") return all.filter((p) => p.clientId === session.clientId);
  return filterProjectsForAgencyUser(session, all);
}

export interface ConversationSummary {
  project: Project;
  lastMessage: ProjectMessage;
  unreadCount: number;
}

export async function getConversationsForSession(session: SessionPayload): Promise<ConversationSummary[]> {
  const projects = await projectsVisibleTo(session);
  const otherRole = session.role === "agency" ? "client" : "agency";

  const summaries: ConversationSummary[] = [];
  for (const project of projects) {
    const messages = await projectMessageRepository.listByProjectId(project.id);
    if (messages.length === 0) continue;
    const lastMessage = messages[messages.length - 1];
    const read = await conversationReadRepository.find(project.id, session.userId);
    const lastReadAt = read?.lastReadAt;
    const unreadCount = messages.filter(
      (m) => m.authorRole === otherRole && (!lastReadAt || new Date(m.createdAt).getTime() > new Date(lastReadAt).getTime()),
    ).length;
    summaries.push({ project, lastMessage, unreadCount });
  }

  return summaries.sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
}

/** TopBar's notification-adjacent unread count isn't this — see notification-service.ts. This is Messages' own badge. */
export async function getUnreadMessageCountForSession(session: SessionPayload): Promise<number> {
  const conversations = await getConversationsForSession(session);
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}

/** Marking a conversation read is available to anyone who can see it (including client viewers) — it's not an "action" gated by canAct. */
export async function markConversationRead(session: SessionPayload, projectId: string): Promise<ServiceResult<null>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");

  if (session.role === "client") {
    if (project.clientId !== session.clientId) return forbidden("You don't have access to this conversation.");
  } else if (session.agencyRole !== "owner" && session.agencyRole !== "admin" && project.assigneeId !== session.userId) {
    return forbidden("You're not assigned to this project.");
  }

  await conversationReadRepository.upsert({
    id: `read-${projectId}-${session.userId}`,
    projectId,
    userId: session.userId,
    lastReadAt: new Date().toISOString(),
  });
  return ok(null);
}
