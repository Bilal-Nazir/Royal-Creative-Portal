import Redis from "ioredis";
import { env } from "../env";

/** Same hot-reload-survives-cache pattern as mongoose.ts. */
declare global {
  var __rcRedis: Redis | undefined;
}

/**
 * Tests run against Redis DB index 1 (set via REDIS_URL in .env.test) so
 * `redis-cli FLUSHDB` in a test teardown never touches dev data in DB 0.
 */
export function getRedis(): Redis {
  if (globalThis.__rcRedis) return globalThis.__rcRedis;
  const client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });
  globalThis.__rcRedis = client;
  return client;
}
