import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env";
import type { StorageProvider, GetDownloadUrlOptions } from "./storage-provider";

/** STORAGE_DRIVER=s3 — private bucket (AWS S3 or any S3-compatible endpoint, e.g. Cloudflare R2 via S3_ENDPOINT). Downloads are short-lived signed URLs, never a public object URL. */
export class S3StorageProvider implements StorageProvider {
  private client: S3Client | null = null;

  private getClient(): S3Client {
    if (this.client) return this.client;
    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
      credentials:
        env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
          ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY }
          : undefined,
    });
    return this.client;
  }

  async save(buffer: Buffer): Promise<string> {
    const storageId = randomUUID();
    await this.getClient().send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: storageId, Body: buffer }));
    return storageId;
  }

  async read(storageId: string): Promise<Buffer | null> {
    try {
      const result = await this.getClient().send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: storageId }));
      const bytes = await result.Body?.transformToByteArray();
      return bytes ? Buffer.from(bytes) : null;
    } catch {
      return null;
    }
  }

  async getDownloadUrl(storageId: string, options: GetDownloadUrlOptions): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: storageId,
      ResponseContentDisposition: `attachment; filename="${options.filename}"`,
      ResponseContentType: options.mimeType,
    });
    return getSignedUrl(this.getClient(), command, { expiresIn: options.expirySeconds });
  }
}
