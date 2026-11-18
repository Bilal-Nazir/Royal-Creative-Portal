import { projectRepository, activityRepository, attentionRepository, userRepository } from "../repositories/container";
import type { SessionPayload } from "../auth/session";
import { filterProjectsForAgencyUser } from "./permissions";
import { forbidden, ok, type ServiceResult } from "./result";
import { isAgencyUser } from "../domain/user";
import type { Project } from "../domain/project";
import { CLIENT_DIRECTORY, type ClientDirectoryEntry } from "../repositories/in-memory/seed-data-phase2a";
import { SEED_USERS } from "../repositories/in-memory/seed-data";

export async function getClientDashboardData(clientId: string) {
  const [projects, activities, attentionTasks] = await Promise.all([
    projectRepository.listByClientId(clientId),
    activityRepository.listByClientId(clientId),
    attentionRepository.listByClientId(clientId),
  ]);
  return { projects, activities, attentionTasks };
}

export async function getProjectsForAgencyUser(session: SessionPayload) {
  const all = await projectRepository.listAll();
  return filterProjectsForAgencyUser(session, all);
}

/** For A04's assignee selector — every agency staff member, any role. */
export function getAssignableAgencyUsers(): Array<{ id: string; name: string }> {
  return SEED_USERS.filter(isAgencyUser).map((u) => ({ id: u.id, name: u.name }));
}

/** For A04's client/contact selector — see DESIGN_NOTES (missing in Figma). */
export function getClientDirectory(): ClientDirectoryEntry[] {
  return CLIENT_DIRECTORY;
}

export interface CreateProjectInput {
  name: string;
  description: string;
  clientId: string;
  assigneeId: string;
  dueDate: string;
}

export async function createProject(
  session: SessionPayload,
  input: CreateProjectInput,
): Promise<ServiceResult<Project>> {
  if (session.role !== "agency") return forbidden("Only agency staff can create a project.");

  const client = CLIENT_DIRECTORY.find((c) => c.clientId === input.clientId);
  if (!client) return forbidden("Unknown client.");

  const assignee = await userRepository.findById(input.assigneeId);
  if (!assignee || !isAgencyUser(assignee)) return forbidden("Unknown assignee.");

  const project: Project = {
    id: `proj-${input.clientId}-${Date.now().toString(36)}`,
    name: input.name,
    description: input.description,
    projectType: "Website development",
    clientId: input.clientId,
    clientName: client.clientName,
    contactName: session.name,
    stage: "brief",
    statusLabel: "Brief in progress",
    clientStatusLabel: "In progress",
    waitingOn: "agency",
    assigneeId: assignee.id,
    assigneeName: assignee.name,
    dueDate: input.dueDate,
    openRevisions: 0,
    nextMilestone: { label: "Brief review", date: input.dueDate, waitingOn: "agency" },
    launchChecklist: { clientApproval: false, finalPayment: false, domainHosting: false, qualityChecks: false },
    forcedAdvances: [],
  };
  await projectRepository.create(project);
  return ok(project);
}
