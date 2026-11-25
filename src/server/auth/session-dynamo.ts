import { randomBytes } from "node:crypto";
import { getItem, putItem, deleteItem, queryGsi } from "../db/dynamo";
import { SESSION_MAX_AGE_SECONDS, sessionPayloadSchema, type SessionPayload, type SessionService } from "./session-types";

interface SessionRecord {
  token: string;
  userId: string;
  payload: string;
  /** Epoch seconds — DynamoDB's TTL feature auto-deletes expired rows, but TTL cleanup isn't instant, so verify() double-checks this on every read. */
  expiresAt: number;
}

function nowPlusMaxAge(): number {
  return Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
}

/**
 * Opaque token + sliding expiry, same shape as the in-memory implementation
 * (session-memory.ts) used for tests. The `sessions` table's byUserId GSI
 * is what makes revokeAllForUser a single Query instead of a table scan.
 */
export class DynamoSessionService implements SessionService {
  async create(payload: SessionPayload): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    const record: SessionRecord = { token, userId: payload.userId, payload: JSON.stringify(payload), expiresAt: nowPlusMaxAge() };
    await putItem("sessions", record);
    return token;
  }

  async verify(token: string): Promise<SessionPayload | null> {
    const record = await getItem<SessionRecord>("sessions", token);
    if (!record) return null;
    if (record.expiresAt < Math.floor(Date.now() / 1000)) return null;

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(record.payload);
    } catch {
      return null;
    }
    const result = sessionPayloadSchema.safeParse(parsedJson);
    if (!result.success) return null;

    // Sliding expiry: every verified request extends the session instead of it dying at a fixed clock time.
    await putItem("sessions", { ...record, expiresAt: nowPlusMaxAge() });
    return result.data;
  }

  async destroy(token: string): Promise<void> {
    await deleteItem("sessions", token);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    const records = await queryGsi<SessionRecord>("sessions", "byUserId", userId);
    await Promise.all(records.map((record) => deleteItem("sessions", record.token)));
  }
}
