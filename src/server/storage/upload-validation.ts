import type { UploadScope } from "../domain/upload";

const MAX_CONTENT_FILE_BYTES = 20 * 1024 * 1024;
const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;

const ALLOWED_CONTENT_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
]);

const ALLOWED_SCREENSHOT_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export interface UploadValidationResult {
  ok: boolean;
  error?: string;
}

export function validateUpload(scope: UploadScope, mimeType: string, size: number): UploadValidationResult {
  const allowedTypes = scope === "design-screenshot" ? ALLOWED_SCREENSHOT_MIME_TYPES : ALLOWED_CONTENT_MIME_TYPES;
  const maxBytes = scope === "design-screenshot" ? MAX_SCREENSHOT_BYTES : MAX_CONTENT_FILE_BYTES;

  if (!allowedTypes.has(mimeType)) {
    return { ok: false, error: `File type "${mimeType}" isn't allowed here.` };
  }
  if (size > maxBytes) {
    return { ok: false, error: `File is too large (max ${Math.round(maxBytes / (1024 * 1024))}MB).` };
  }
  if (size <= 0) {
    return { ok: false, error: "File is empty." };
  }
  return { ok: true };
}

/**
 * Strips path separators and anything that isn't alphanumeric/dash/
 * underscore/dot, collapses repeats, and caps length — so a stored filename
 * can never escape its directory or collide with control characters, no
 * matter what the browser sent.
 */
export function sanitizeFilename(originalName: string): string {
  const base = originalName.split(/[/\\]/).pop() ?? "file";
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  const truncated = cleaned.slice(0, 120);
  return truncated.length > 0 ? truncated : "file";
}
