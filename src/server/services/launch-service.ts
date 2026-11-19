import { projectRepository } from "../repositories/container";
import { assertAgencyCanManageProject } from "./permissions";
import { ok, badRequest, notFound, type ServiceResult } from "./result";
import { tryAdvanceStageIfGated } from "./stage-service";
import { notifyClient } from "./notification-service";
import { isLaunchChecklistComplete, type LaunchChecklistState, type Project } from "../domain/project";
import type { SessionPayload } from "../auth/session";

/** The two manual checks on A13 — "Client approval" and "Final payment" are set automatically elsewhere and never accepted here. */
export type ManualLaunchChecklistItem = Extract<keyof LaunchChecklistState, "domainHosting" | "qualityChecks">;

/** A13 — agency ticks the two manual launch checks; the other two (client approval, final payment) are driven by other services. */
export async function updateLaunchChecklistItem(
  session: SessionPayload,
  projectId: string,
  item: ManualLaunchChecklistItem,
  value: boolean,
): Promise<ServiceResult<Project>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<Project>(session, project);
  if (denied) return denied;

  if (item !== "domainHosting" && item !== "qualityChecks") {
    return badRequest("Only domain & hosting and quality checks can be set manually.");
  }

  const updated: Project = { ...project, launchChecklist: { ...project.launchChecklist, [item]: value } };
  await projectRepository.update(updated);
  return ok(updated);
}

/** A13 — the agreed launch date and live URL, editable independent of checklist completion (shown on C14 while checks are still in progress). */
export async function setLaunchDetails(
  session: SessionPayload,
  projectId: string,
  input: { launchDate: string; liveUrl: string },
): Promise<ServiceResult<Project>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<Project>(session, project);
  if (denied) return denied;

  if (!input.launchDate.trim()) return badRequest("Set an agreed launch date.");
  if (!input.liveUrl.trim()) return badRequest("Set the live website URL.");

  const updated: Project = { ...project, launchDate: input.launchDate, liveUrl: input.liveUrl };
  await projectRepository.update(updated);
  return ok(updated);
}

/** A13's "Go live" — only allowed once all 4 checks are complete and launch details are set; moves the project to Handover. */
export async function goLive(session: SessionPayload, projectId: string): Promise<ServiceResult<Project>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<Project>(session, project);
  if (denied) return denied;

  if (!isLaunchChecklistComplete(project.launchChecklist)) {
    return badRequest("All 4 launch checks must be complete before going live.");
  }
  if (!project.launchDate || !project.liveUrl) {
    return badRequest("Set the agreed launch date and live URL before going live.");
  }

  const updatedProject = await tryAdvanceStageIfGated(project);
  if (updatedProject.stage === "handover") {
    await notifyClient(projectId, "website_live", "Your website is live", `${project.name} is now live at ${project.liveUrl}.`);
  }
  return ok(updatedProject);
}
