export type UploadScope = "content" | "design-screenshot";

/**
 * Metadata for a file the StorageProvider holds (server/storage/storage-provider.ts).
 * Deliberately separate from the provider: this record is what permission
 * checks and download routes see — `storageId` is the only thing that
 * actually locates bytes on disk, and it's never exposed as a public URL.
 */
export interface UploadedFile {
  id: string;
  projectId: string;
  scope: UploadScope;
  storageId: string;
  originalName: string;
  sanitizedName: string;
  mimeType: string;
  size: number;
  uploadedByUserId: string;
  uploadedByName: string;
  createdAt: string;
}
