import { handoverResourceRepository, projectRepository } from "../repositories/container";
import { assertAgencyCanManageProject } from "./permissions";
import { ok, badRequest, notFound, type ServiceResult } from "./result";
import type { SessionPayload } from "../auth/session";
import type { HandoverResource, HandoverResourceType } from "../domain/handover-resource";

export async function getHandoverResources(projectId: string): Promise<HandoverResource[]> {
  return handoverResourceRepository.listByProjectId(projectId);
}

export interface AddHandoverResourceInput {
  title: string;
  type: HandoverResourceType;
  fileId?: string;
  url?: string;
}

/** A13's "Handover resources" section (no Figma screen for the agency side — see DESIGN_NOTES) and C15's handover pack. */
export async function addHandoverResource(
  session: SessionPayload,
  projectId: string,
  input: AddHandoverResourceInput,
): Promise<ServiceResult<HandoverResource>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<HandoverResource>(session, project);
  if (denied) return denied;

  if (!input.title.trim()) return badRequest("Give this resource a title.");
  if (!input.fileId && !input.url?.trim()) return badRequest("Attach a file or provide a URL.");
  if (input.fileId && input.url) return badRequest("Provide either a file or a URL, not both.");

  const resource: HandoverResource = {
    id: `handover-${projectId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    projectId,
    title: input.title.trim(),
    type: input.type,
    fileId: input.fileId,
    url: input.url?.trim(),
    addedByName: session.name,
    addedAt: new Date().toISOString(),
  };
  await handoverResourceRepository.create(resource);
  return ok(resource);
}

export async function removeHandoverResource(session: SessionPayload, projectId: string, resourceId: string): Promise<ServiceResult<null>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<null>(session, project);
  if (denied) return denied;

  const resource = await handoverResourceRepository.findById(resourceId);
  if (!resource || resource.projectId !== projectId) return notFound("Resource not found.");

  await handoverResourceRepository.delete(resourceId);
  return ok(null);
}
