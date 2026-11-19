import { uploadedFileRepository, projectRepository } from "../repositories/container";
import { storageProvider } from "../storage/storage-provider";
import { validateUpload, sanitizeFilename } from "../storage/upload-validation";
import { assertClientCanActOnProject, assertAgencyCanManageProject } from "./permissions";
import { ok, badRequest, notFound, forbidden, type ServiceResult } from "./result";
import type { SessionPayload } from "../auth/session";
import type { UploadedFile, UploadScope } from "../domain/upload";

export interface UploadFileInput {
  projectId: string;
  scope: UploadScope;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
}

/**
 * Validates, sanitizes, and persists an upload behind the StorageProvider.
 * Both client and agency sessions can upload (content items are client-
 * submitted, design screenshots are agency-submitted) — permission is
 * scoped to "can this session act on this project at all", not by role,
 * since both roles legitimately upload to the same project.
 */
export async function uploadFile(session: SessionPayload, input: UploadFileInput): Promise<ServiceResult<UploadedFile>> {
  const project = await projectRepository.findById(input.projectId);
  if (!project) return notFound("Project not found.");

  const denied =
    session.role === "client"
      ? assertClientCanActOnProject<UploadedFile>(session, project)
      : assertAgencyCanManageProject<UploadedFile>(session, project);
  if (denied) return denied;

  const validation = validateUpload(input.scope, input.mimeType, input.buffer.byteLength);
  if (!validation.ok) return badRequest(validation.error ?? "Invalid file.");

  const storageId = await storageProvider.save(input.buffer);
  const file: UploadedFile = {
    id: `file-${input.projectId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId: input.projectId,
    scope: input.scope,
    storageId,
    originalName: input.originalName,
    sanitizedName: sanitizeFilename(input.originalName),
    mimeType: input.mimeType,
    size: input.buffer.byteLength,
    uploadedByUserId: session.userId,
    uploadedByName: session.name,
    createdAt: new Date().toISOString(),
  };
  await uploadedFileRepository.create(file);
  return ok(file);
}

/** Display-only metadata lookup (names for an attachment list) — downloads still only ever happen through downloadFile's permission check. */
export async function getUploadedFilesMeta(fileIds: string[]): Promise<UploadedFile[]> {
  const files = await Promise.all(fileIds.map((id) => uploadedFileRepository.findById(id)));
  return files.filter((f): f is UploadedFile => f !== null);
}

export interface DownloadableFile {
  meta: UploadedFile;
  buffer: Buffer;
}

/** Authorized download — the only way to read a file's bytes. Never served as a public URL. */
export async function downloadFile(session: SessionPayload, fileId: string): Promise<ServiceResult<DownloadableFile>> {
  const meta = await uploadedFileRepository.findById(fileId);
  if (!meta) return notFound("File not found.");

  const project = await projectRepository.findById(meta.projectId);
  if (!project) return notFound("Project not found.");

  const isClientOnProject = session.role === "client" && project.clientId === session.clientId;
  const isAgencyOnProject =
    session.role === "agency" && (session.agencyRole === "owner" || session.agencyRole === "admin" || project.assigneeId === session.userId);
  if (!isClientOnProject && !isAgencyOnProject) return forbidden("You don't have access to this file.");

  const buffer = await storageProvider.read(meta.storageId);
  if (!buffer) return notFound("File not found.");
  return ok({ meta, buffer });
}
