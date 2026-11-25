/**
 * npm run dynamo:create-tables — idempotent: lists existing tables first,
 * only creates the ones missing. Safe to re-run any time (e.g. after adding
 * a new table to dynamo-tables.ts) — never touches or deletes existing
 * tables/data. On-demand billing (PAY_PER_REQUEST), so creating a table
 * costs nothing until it's actually used.
 *
 * Run with tsx so it's plain TypeScript, no build step:
 *   npm run dynamo:create-tables
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  DynamoDBClient,
  CreateTableCommand,
  ListTablesCommand,
  UpdateTimeToLiveCommand,
  waitUntilTableExists,
  type AttributeDefinition,
  type KeySchemaElement,
  type GlobalSecondaryIndex,
} from "@aws-sdk/client-dynamodb";

function loadEnvLocal(): void {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

/** Sort-key attributes that are numbers — everything else (ids, emails, tokens, composite keys) is a string. */
const NUMBER_ATTRIBUTES = new Set(["versionNumber"]);

function attrType(name: string): "S" | "N" {
  return NUMBER_ATTRIBUTES.has(name) ? "N" : "S";
}

async function main() {
  loadEnvLocal();
  if (!process.env.AWS_REGION) throw new Error("AWS_REGION is required (.env.local).");
  if (!process.env.DYNAMO_TABLE_PREFIX) throw new Error("DYNAMO_TABLE_PREFIX is required (.env.local).");

  const { TABLES } = await import("../src/server/db/dynamo-tables");
  const client = new DynamoDBClient({});

  const existing = new Set((await client.send(new ListTablesCommand({}))).TableNames ?? []);

  let created = 0;
  for (const [key, rawTable] of Object.entries(TABLES)) {
    const table = rawTable as import("../src/server/db/dynamo-tables").TableDef;
    const fullName = `${process.env.DYNAMO_TABLE_PREFIX}-${table.name}`;
    if (existing.has(fullName)) {
      console.log(`Skipping ${fullName} (already exists).`);
      continue;
    }

    const attributeDefinitions: AttributeDefinition[] = [{ AttributeName: table.pk, AttributeType: attrType(table.pk) }];
    const keySchema: KeySchemaElement[] = [{ AttributeName: table.pk, KeyType: "HASH" }];
    if (table.sk) {
      attributeDefinitions.push({ AttributeName: table.sk, AttributeType: attrType(table.sk) });
      keySchema.push({ AttributeName: table.sk, KeyType: "RANGE" });
    }

    const globalSecondaryIndexes: GlobalSecondaryIndex[] = [];
    for (const gsi of table.gsis ?? []) {
      if (!attributeDefinitions.some((a) => a.AttributeName === gsi.pk)) {
        attributeDefinitions.push({ AttributeName: gsi.pk, AttributeType: attrType(gsi.pk) });
      }
      const gsiKeySchema: KeySchemaElement[] = [{ AttributeName: gsi.pk, KeyType: "HASH" }];
      if (gsi.sk) {
        if (!attributeDefinitions.some((a) => a.AttributeName === gsi.sk)) {
          attributeDefinitions.push({ AttributeName: gsi.sk, AttributeType: attrType(gsi.sk) });
        }
        gsiKeySchema.push({ AttributeName: gsi.sk, KeyType: "RANGE" });
      }
      globalSecondaryIndexes.push({
        IndexName: gsi.name,
        KeySchema: gsiKeySchema,
        Projection: { ProjectionType: "ALL" },
      });
    }

    console.log(`Creating ${fullName}...`);
    await client.send(
      new CreateTableCommand({
        TableName: fullName,
        BillingMode: "PAY_PER_REQUEST",
        AttributeDefinitions: attributeDefinitions,
        KeySchema: keySchema,
        GlobalSecondaryIndexes: globalSecondaryIndexes.length > 0 ? globalSecondaryIndexes : undefined,
      }),
    );
    await waitUntilTableExists({ client, maxWaitTime: 60 }, { TableName: fullName });

    if (table.ttlAttribute) {
      await client.send(
        new UpdateTimeToLiveCommand({
          TableName: fullName,
          TimeToLiveSpecification: { AttributeName: table.ttlAttribute, Enabled: true },
        }),
      );
      console.log(`  TTL enabled on "${table.ttlAttribute}".`);
    }

    created++;
    console.log(`  Created (key: ${key}).`);
  }

  console.log(`\nDone. ${created} table(s) created, ${Object.keys(TABLES).length - created} already existed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
