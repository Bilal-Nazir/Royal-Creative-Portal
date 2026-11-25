import { env } from "../env";
import { InMemorySessionService } from "./session-memory";
import { DynamoSessionService } from "./session-dynamo";
import type { SessionService } from "./session-types";

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, type SessionPayload, type SessionService } from "./session-types";

let instance: SessionService | null = null;

function getInstance(): SessionService {
  if (!instance) {
    instance = env.REPOSITORY_DRIVER === "dynamo" ? new DynamoSessionService() : new InMemorySessionService();
  }
  return instance;
}

/**
 * Driver swap — same shape as repositories/container.ts: both implementations
 * are imported statically, one is picked at runtime. Picked lazily (on first
 * method call, not at module load) for the same cold-start reason `env` is
 * lazy — see src/server/env.ts.
 */
export const sessionService: SessionService = new Proxy({} as SessionService, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getInstance(), prop, receiver);
    return typeof value === "function" ? value.bind(getInstance()) : value;
  },
});
