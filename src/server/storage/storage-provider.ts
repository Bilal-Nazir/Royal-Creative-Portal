import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface StorageProvider {
  /** Returns a storageId that locates the bytes — never a public URL, never exposed to clients directly. */
  save(buffer: Buffer): Promise<string>;
  read(storageId: string): Promise<Buffer | null>;
}

const UPLOAD_DIR = join(process.cwd(), ".data", "uploads");

/**
 * Dev-only local disk storage, mirroring the file-store's "outside the JS
 * module graph" reasoning — uploads happen in a route handler, downloads are
 * read by a different route handler, so bytes have to live on disk, not in
 * memory. A real deployment swaps this for S3/GCS behind the same interface;
 * nothing above server/storage needs to change.
 */
class LocalDiskStorageProvider implements StorageProvider {
  async save(buffer: Buffer): Promise<string> {
    mkdirSync(UPLOAD_DIR, { recursive: true });
    const storageId = randomUUID();
    writeFileSync(this.pathFor(storageId), buffer);
    return storageId;
  }

  async read(storageId: string): Promise<Buffer | null> {
    const path = this.pathFor(storageId);
    if (!existsSync(path)) return null;
    return readFileSync(path);
  }

  private pathFor(storageId: string): string {
    // storageId is always our own randomUUID() output — never derived from
    // user input — so there's no path-traversal surface here.
    return join(UPLOAD_DIR, storageId);
  }
}

export const storageProvider: StorageProvider = new LocalDiskStorageProvider();
