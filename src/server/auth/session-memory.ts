import { randomBytes } from "node:crypto";
import { SESSION_MAX_AGE_SECONDS, type SessionPayload, type SessionService } from "./session-types";

interface SessionRecord {
  payload: SessionPayload;
  expiresAt: number;
}

/** Plain in-process Map — same rationale as repositories/in-memory/memory-store.ts: tests run in a single vitest worker, so there's nothing to persist across requests. */
let store = new Map<string, SessionRecord>();

export function resetSessionStore(): void {
  store = new Map();
}

/** Used only when REPOSITORY_DRIVER=memory (tests) — zero external dependency, replacing what used to be a real Redis instance on DB index 1. */
export class InMemorySessionService implements SessionService {
  async create(payload: SessionPayload): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    store.set(token, { payload, expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 });
    return token;
  }

  async verify(token: string): Promise<SessionPayload | null> {
    const record = store.get(token);
    if (!record) return null;
    if (record.expiresAt < Date.now()) {
      store.delete(token);
      return null;
    }
    // Sliding expiry: every verified request extends the session instead of it dying at a fixed clock time.
    record.expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
    return record.payload;
  }

  async destroy(token: string): Promise<void> {
    store.delete(token);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    for (const [token, record] of store) {
      if (record.payload.userId === userId) store.delete(token);
    }
  }
}
