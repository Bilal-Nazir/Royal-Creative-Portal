import { env } from "../env";
import { withTransaction as withDynamoTransaction } from "./dynamo";
import type { Tx } from "../repositories/interfaces";

/**
 * Driver-neutral entrypoint the 3 transactional call sites (stage-service,
 * scope-change-service, proposal-service) import. REPOSITORY_DRIVER=memory
 * (tests) has nothing to transact — the in-memory repositories ignore `tx`
 * entirely — so `fn(null)` runs standalone.
 */
export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (env.REPOSITORY_DRIVER === "dynamo") return withDynamoTransaction(fn);
  return fn(null);
}
