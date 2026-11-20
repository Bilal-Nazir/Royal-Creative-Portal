import { projectRepository, activityRepository, attentionRepository, userRepository } from "../repositories/container";
import type { SessionPayload } from "../auth/session";
import { filterProjectsForAgencyUser } from "./permissions";
import { forbidden, ok, type ServiceResult } from "./result";
import { isAgencyUser, isClientUser, type ClientUser } from "../domain/user";
import type { Project, ProjectType } from "../domain/project";
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

export interface ClientDirectoryEntry {
  clientId: string;
  clientName: string;
  contactName: string;
}

/**
 * For A04's client/contact selector — see DESIGN_NOTES (missing in Figma).
 * Built from real ClientUser + Project records, not a hardcoded map.
 * clientName (the company) only exists on a Project once one has been
 * created — a client with no project yet falls back to their own contact
 * name, so they're still selectable when creating their first project.
 * When a client has more than one user, the participant (not a viewer) is
 * preferred as the directory's contact.
 */
export async function getClientDirectory(): Promise<ClientDirectoryEntry[]> {
  const [users, projects] = await Promise.all([userRepository.listClientUsers(), projectRepository.listAll()]);
  const clientNameByClientId = new Map(projects.map((p) => [p.clientId, p.clientName]));

  const contactByClientId = new Map<string, ClientUser>();
  for (const user of users.filter(isClientUser)) {
    const existing = contactByClientId.get(user.clientId);
    if (!existing || (existing.clientRole !== "participant" && user.clientRole === "participant")) {
      contactByClientId.set(user.clientId, user);
    }
  }

  return Array.from(contactByClientId.entries()).map(([clientId, user]) => ({
    clientId,
    clientName: clientNameByClientId.get(clientId) ?? user.name,
    contactName: user.name,
  }));
}

export interface CreateProjectInput {
  name: string;
  description: string;
  projectType: ProjectType;
  clientId: string;
  assigneeId: string;
  dueDate: string;
}

export async function createProject(
  session: SessionPayload,
  input: CreateProjectInput,
): Promise<ServiceResult<Project>> {
  if (session.role !== "agency") return forbidden("Only agency staff can create a project.");

  const directory = await getClientDirectory();
  const client = directory.find((c) => c.clientId === input.clientId);
  if (!client) return forbidden("Unknown client.");

  const assignee = await userRepository.findById(input.assigneeId);
  if (!assignee || !isAgencyUser(assignee)) return forbidden("Unknown assignee.");

  const project: Project = {
    id: `proj-${input.clientId}-${Date.now().toString(36)}`,
    name: input.name,
    description: input.description,
    projectType: input.projectType,
    createdAt: new Date().toISOString(),
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
