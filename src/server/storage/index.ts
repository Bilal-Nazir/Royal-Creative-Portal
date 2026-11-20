import { env } from "../env";
import { LocalDiskStorageProvider } from "./storage-provider";
import { S3StorageProvider } from "./s3-provider";
import type { StorageProvider } from "./storage-provider";

/** STORAGE_DRIVER=local (default) or s3. */
export const storageProvider: StorageProvider = env.STORAGE_DRIVER === "s3" ? new S3StorageProvider() : new LocalDiskStorageProvider();

export type { StorageProvider, GetDownloadUrlOptions } from "./storage-provider";
