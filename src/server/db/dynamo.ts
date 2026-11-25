import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  type TransactWriteItem,
  type NativeAttributeValue,
} from "@aws-sdk/lib-dynamodb";
import { env } from "../env";
import { TABLES, type TableKey, type TableDef } from "./dynamo-tables";

function tableDef(key: TableKey): TableDef {
  return TABLES[key];
}

/** Same hot-reload-survives-cache pattern as mongoose.ts/redis.ts. */
declare global {
  var __rcDynamo: DynamoDBDocumentClient | undefined;
}

/** Credentials/region come from the AWS SDK's own default chain (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION env vars) — nothing to configure here beyond the client itself. */
export function getDynamo(): DynamoDBDocumentClient {
  if (globalThis.__rcDynamo) return globalThis.__rcDynamo;
  const client = new DynamoDBClient({});
  globalThis.__rcDynamo = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
  return globalThis.__rcDynamo;
}

/** Environment-scoped table name (e.g. "rc-portal-dev-projects") so dev/staging/prod can share one AWS account without colliding. */
export function tableName(key: TableKey): string {
  return `${env.DYNAMO_TABLE_PREFIX}-${tableDef(key).name}`;
}

/**
 * Collects writes for an atomic DynamoDB transaction — the Dynamo analogue
 * of Mongo's ClientSession. Unlike Mongo, DynamoDB transactions are
 * write-only (no reads inside the transaction), so every repository method
 * that takes a `tx` just appends a Put/Update descriptor here instead of
 * writing immediately; withTransaction() submits them all atomically once
 * `fn` returns. Reads that decide what to write must happen before the
 * transaction starts (the 3 call sites that use this already do).
 */
export interface TransactionContext {
  items: TransactWriteItem[];
}

/**
 * Mirrors db/mongoose.ts's withTransaction signature exactly so the 3 call
 * sites (stage-service, scope-change-service, proposal-service) don't
 * change — only the import and the type of the session/tx parameter do.
 */
export async function withTransaction<T>(fn: (tx: TransactionContext | null) => Promise<T>): Promise<T> {
  if (env.REPOSITORY_DRIVER !== "dynamo") {
    return fn(null);
  }

  const tx: TransactionContext = { items: [] };
  const result = await fn(tx);
  if (tx.items.length > 0) {
    await getDynamo().send(new TransactWriteCommand({ TransactItems: tx.items }));
  }
  return result;
}

/** Full-item overwrite — every repository's update()/create() is this, matching the Mongo repositories' own `fromDomain` full-replace convention. When `tx` is given, queues the write instead of sending it immediately. */
export async function putItem(tableKey: TableKey, item: Record<string, NativeAttributeValue>, tx?: TransactionContext | null): Promise<void> {
  const TableName = tableName(tableKey);
  if (tx) {
    tx.items.push({ Put: { TableName, Item: item } });
    return;
  }
  await getDynamo().send(new PutCommand({ TableName, Item: item }));
}

export async function getItem<T>(tableKey: TableKey, pkValue: string): Promise<T | null> {
  const table = tableDef(tableKey);
  const result = await getDynamo().send(
    new GetCommand({ TableName: tableName(tableKey), Key: { [table.pk]: pkValue } }),
  );
  return (result.Item as T | undefined) ?? null;
}

export async function deleteItem(tableKey: TableKey, pkValue: string): Promise<void> {
  const table = tableDef(tableKey);
  await getDynamo().send(new DeleteCommand({ TableName: tableName(tableKey), Key: { [table.pk]: pkValue } }));
}

export interface QueryGsiOptions {
  /** Narrows to a single sort-key value (exact match) on a GSI that has one. */
  skEquals?: string | number;
  /** Narrows to sort keys starting with this prefix (e.g. `${kind}#`) — for the kindVersionKey/kindRoundKey/targetKey tricks. */
  skBeginsWith?: string;
  scanIndexForward?: boolean;
  limit?: number;
}

/** Query a GSI by its partition key, optionally narrowed by its sort key. */
export async function queryGsi<T>(tableKey: TableKey, gsiName: string, pkValue: string | number, options: QueryGsiOptions = {}): Promise<T[]> {
  const table = tableDef(tableKey);
  const gsi = table.gsis?.find((g) => g.name === gsiName);
  if (!gsi) throw new Error(`Unknown GSI "${gsiName}" on table "${tableKey}".`);

  let keyConditionExpression = "#pk = :pk";
  const expressionAttributeNames: Record<string, string> = { "#pk": gsi.pk };
  const expressionAttributeValues: Record<string, unknown> = { ":pk": pkValue };

  if (gsi.sk && options.skEquals !== undefined) {
    keyConditionExpression += " AND #sk = :sk";
    expressionAttributeNames["#sk"] = gsi.sk;
    expressionAttributeValues[":sk"] = options.skEquals;
  } else if (gsi.sk && options.skBeginsWith !== undefined) {
    keyConditionExpression += " AND begins_with(#sk, :sk)";
    expressionAttributeNames["#sk"] = gsi.sk;
    expressionAttributeValues[":sk"] = options.skBeginsWith;
  }

  const result = await getDynamo().send(
    new QueryCommand({
      TableName: tableName(tableKey),
      IndexName: gsiName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ScanIndexForward: options.scanIndexForward,
      Limit: options.limit,
    }),
  );
  return (result.Items as T[] | undefined) ?? [];
}

/**
 * Full-table read — used for listAll()/small reference-data tables. Fine at
 * this app's declared scale (an internal agency tool with a handful of
 * clients); if a table ever grows large enough for Scan cost to matter, add
 * a GSI for that specific access pattern instead.
 */
export async function scanAll<T>(tableKey: TableKey, filter?: { attr: string; value: unknown }): Promise<T[]> {
  const items: Record<string, unknown>[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const result = await getDynamo().send(
      new ScanCommand({
        TableName: tableName(tableKey),
        ExclusiveStartKey,
        ...(filter
          ? {
              FilterExpression: "#attr = :value",
              ExpressionAttributeNames: { "#attr": filter.attr },
              ExpressionAttributeValues: { ":value": filter.value },
            }
          : {}),
      }),
    );
    items.push(...(result.Items ?? []));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return items as T[];
}
