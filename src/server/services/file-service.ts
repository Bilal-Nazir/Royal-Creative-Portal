import { uploadedFileRepository, projectRepository } from "../repositories/container";
import { storageProvider } from "../storage";
import { validateUpload, sanitizeFilename } from "../storage/upload-validation";
import { assertClientCanActOnProject, assertAgencyCanManageProject, filterProjectsForAgencyUser } from "./permissions";
import { ok, badRequest, notFound, forbidden, type ServiceResult } from "./result";
import type { SessionPayload } from "../auth/session";
import type { UploadedFile, UploadScope } from "../domain/upload";
import type { Project } from "../domain/project";

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

export interface FileWithProject {
  file: UploadedFile;
  project: Project;
}

/** Client/agency "Files" nav pages (Phase 3) — every file shared on a project this session can see, newest first. */
export async function listFilesForSession(session: SessionPayload): Promise<FileWithProject[]> {
  const all = await projectRepository.listAll();
  const projects = session.role === "client" ? all.filter((p) => p.clientId === session.clientId) : filterProjectsForAgencyUser(session, all);

  const rows: FileWithProject[] = [];
  for (const project of projects) {
    const files = await uploadedFileRepository.listByProjectId(project.id);
    for (const file of files) rows.push({ file, project });
  }
  return rows.sort((a, b) => new Date(b.file.createdAt).getTime() - new Date(a.file.createdAt).getTime());
}

export type DownloadableFile = { meta: UploadedFile } & ({ kind: "redirect"; url: string } | { kind: "buffer"; buffer: Buffer });

const SIGNED_URL_EXPIRY_SECONDS = 5 * 60;

/**
 * Authorized download — the only way to read a file's bytes (or a link to
 * them). Never served as a public URL. STORAGE_DRIVER=s3 returns a 5-minute
 * signed URL to redirect to instead of proxying bytes through this server;
 * local disk has no such concept, so it falls back to reading the bytes.
 */
export async function downloadFile(session: SessionPayload, fileId: string): Promise<ServiceResult<DownloadableFile>> {
  const meta = await uploadedFileRepository.findById(fileId);
  if (!meta) return notFound("File not found.");

  const project = await projectRepository.findById(meta.projectId);
  if (!project) return notFound("Project not found.");

  const isClientOnProject = session.role === "client" && project.clientId === session.clientId;
  const isAgencyOnProject =
    session.role === "agency" && (session.agencyRole === "owner" || session.agencyRole === "admin" || project.assigneeId === session.userId);
  if (!isClientOnProject && !isAgencyOnProject) return forbidden("You don't have access to this file.");

  const url = await storageProvider.getDownloadUrl(meta.storageId, {
    expirySeconds: SIGNED_URL_EXPIRY_SECONDS,
    filename: meta.sanitizedName,
    mimeType: meta.mimeType,
  });
  if (url) return ok({ meta, kind: "redirect", url });

  const buffer = await storageProvider.read(meta.storageId);
  if (!buffer) return notFound("File not found.");
  return ok({ meta, kind: "buffer", buffer });
}
