import { env } from "../env";
import { InMemorySessionService } from "./session-memory";
import { DynamoSessionService } from "./session-dynamo";
import type { SessionService } from "./session-types";

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, type SessionPayload, type SessionService } from "./session-types";

/** Driver swap — same shape as repositories/container.ts: both implementations are imported statically, one is picked at runtime. */
export const sessionService: SessionService = env.REPOSITORY_DRIVER === "dynamo" ? new DynamoSessionService() : new InMemorySessionService();
