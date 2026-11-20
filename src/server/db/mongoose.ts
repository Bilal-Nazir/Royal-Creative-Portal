import mongoose from "mongoose";
import { env } from "../env";

/**
 * One cached connection, pinned to globalThis so it survives Next.js dev
 * hot-reload (a fresh module instance per reload would otherwise open a new
 * connection every save) — same "outside the JS module graph" rationale the
 * old file store used for cross-request state.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var __rcMongoose: MongooseCache | undefined;
}

const cache: MongooseCache = globalThis.__rcMongoose ?? { conn: null, promise: null };
globalThis.__rcMongoose = cache;

export async function getMongoose(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose.connect(env.MONGODB_URI).then((m) => m);
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

/**
 * Transactions require a replica set (a standalone mongod has no oplog to
 * commit against). Throws with the exact fix rather than letting every
 * transactional write fail with Mongo's much less actionable "Transaction
 * numbers are only allowed on a replica set member" error.
 */
export async function assertReplicaSet(): Promise<void> {
  const m = await getMongoose();
  const admin = m.connection.db?.admin();
  const hello = await admin?.command({ hello: 1 });
  if (!hello?.setName) {
    throw new Error(
      "MongoDB is running as a standalone instance, not a replica set. " +
        "Transactions (proposal acceptance, scope-change acceptance, stage " +
        "changes) require a replica set. Convert it to a single-node replica " +
        "set — see docs/PROJECT_CONTEXT.md.",
    );
  }
}

/**
 * Runs `fn` inside a real Mongo transaction when REPOSITORY_DRIVER=mongo;
 * for the memory driver (unit tests), just calls `fn(null)` directly — no
 * Mongo connection is attempted at all, since there's nothing to transact
 * and the in-memory repositories ignore the session argument anyway.
 */
export async function withTransaction<T>(fn: (session: mongoose.ClientSession | null) => Promise<T>): Promise<T> {
  if (env.REPOSITORY_DRIVER !== "mongo") {
    return fn(null);
  }

  const m = await getMongoose();
  const session = await m.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
