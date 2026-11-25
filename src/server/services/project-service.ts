import { projectRepository, activityRepository, attentionRepository, userRepository, briefRepository, proposalRepository } from "../repositories/container";
import type { SessionPayload } from "../auth/session";
import { filterProjectsForAgencyUser, assertAgencyCanManageProject } from "./permissions";
import { forbidden, notFound, badRequest, ok, type ServiceResult } from "./result";
import { isAgencyUser, isClientUser, type ClientUser } from "../domain/user";
import { PROJECT_TYPES, type Project, type ProjectType } from "../domain/project";
import type { BriefVersion } from "../domain/brief";
import type { ProposalVersion } from "../domain/proposal";
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

export type ProjectStartFrom = "brief" | "proposal";

export interface CreateProjectInput {
  name: string;
  description: string;
  projectType: ProjectType;
  clientId: string;
  assigneeId: string;
  dueDate: string;
  /** A04's "Start from" choice — not in Figma, see DESIGN_NOTES. Defaults to "brief" (the existing behaviour). */
  startFrom?: ProjectStartFrom;
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

  const startFrom = input.startFrom ?? "brief";
  const projectId = `proj-${input.clientId}-${Date.now().toString(36)}`;

  const project: Project = {
    id: projectId,
    name: input.name,
    description: input.description,
    projectType: input.projectType,
    createdAt: new Date().toISOString(),
    clientId: input.clientId,
    clientName: client.clientName,
    contactName: session.name,
    stage: startFrom === "proposal" ? "proposal" : "brief",
    statusLabel: startFrom === "proposal" ? "Proposal in progress" : "Brief in progress",
    clientStatusLabel: "In progress",
    waitingOn: "agency",
    assigneeId: assignee.id,
    assigneeName: assignee.name,
    dueDate: input.dueDate,
    openRevisions: 0,
    nextMilestone: {
      label: startFrom === "proposal" ? "Proposal review" : "Brief review",
      date: input.dueDate,
      waitingOn: "agency",
    },
    launchChecklist: { clientApproval: false, finalPayment: false, domainHosting: false, qualityChecks: false },
    forcedAdvances: [],
  };
  await projectRepository.create(project);

  if (startFrom === "proposal") {
    const now = new Date().toISOString();
    const skippedBrief: BriefVersion = {
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
    await briefRepository.create(skippedBrief);

    const draftProposal: ProposalVersion = {
      id: `proposal-${projectId}-v1`,
      projectId,
      versionNumber: 1,
      fields: { scope: "", timeline: "", revisions: "", exclusions: "" },
      fee: 0,
      paymentSchedule: [],
      includedRevisionRounds: 2,
      status: "draft",
      createdByName: session.name,
      createdAt: now,
    };
    await proposalRepository.create(draftProposal);
  }

  return ok(project);
}

export interface QuickCreateProjectInput {
  name: string;
  assigneeId: string;
  /** Board column the card was created from (A15's inline "+ Create project") — set directly so it appears in the right list without a follow-up move. */
  boardColumnId?: string;
}

/**
 * Jira-style one-line create: title + assignee only. Client, project type and
 * due date are real, permanent fields (no edit history, used for billing and
 * client-facing access) so they can't be guessed — this defaults them to a
 * placeholder client/type/date and relies on updateProjectDetails to fix them
 * up afterward from the project detail page.
 */
export async function quickCreateProject(session: SessionPayload, input: QuickCreateProjectInput): Promise<ServiceResult<Project>> {
  if (!input.name.trim()) return badRequest("Give the project a title.");

  const directory = await getClientDirectory();
  const defaultClient = directory[0];
  if (!defaultClient) return badRequest("Add a client before creating a project.");

  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const result = await createProject(session, {
    name: input.name.trim(),
    description: "",
    projectType: PROJECT_TYPES[0],
    clientId: defaultClient.clientId,
    assigneeId: input.assigneeId,
    dueDate,
  });
  if (!result.ok) return result;

  if (input.boardColumnId) {
    const project: Project = { ...result.data, boardColumnId: input.boardColumnId };
    await projectRepository.update(project);
    return ok(project);
  }
  return result;
}

export interface UpdateProjectDetailsInput {
  clientId?: string;
  projectType?: ProjectType;
  dueDate?: string;
  assigneeId?: string;
}

/** Fixes up the fields quickCreateProject had to guess — gated the same as any other project-management action (owner/admin, or the assignee on their own project). */
export async function updateProjectDetails(
  session: SessionPayload,
  projectId: string,
  patch: UpdateProjectDetailsInput,
): Promise<ServiceResult<Project>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");

  const denied = assertAgencyCanManageProject<Project>(session, project);
  if (denied) return denied;

  const updated: Project = { ...project };

  if (patch.clientId) {
    const directory = await getClientDirectory();
    const client = directory.find((c) => c.clientId === patch.clientId);
    if (!client) return badRequest("Unknown client.");
    updated.clientId = client.clientId;
    updated.clientName = client.clientName;
  }

  if (patch.projectType) {
    if (!PROJECT_TYPES.includes(patch.projectType)) return badRequest("Unknown project type.");
    updated.projectType = patch.projectType;
  }

  if (patch.dueDate) {
    updated.dueDate = patch.dueDate;
  }

  if (patch.assigneeId) {
    const assignee = await userRepository.findById(patch.assigneeId);
    if (!assignee || !isAgencyUser(assignee)) return badRequest("Unknown assignee.");
    updated.assigneeId = assignee.id;
    updated.assigneeName = assignee.name;
  }

  await projectRepository.update(updated);
  return ok(updated);
}
