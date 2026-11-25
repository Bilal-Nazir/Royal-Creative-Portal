/**
 * npm run dynamo:seed — wipes every row in every DynamoDB table (under
 * DYNAMO_TABLE_PREFIX) and reseeds the same demo data the memory driver uses
 * for tests (plus argon2-rehashed passwords, since seed-data.ts's baked-in
 * hash is scrypt, kept only for the memory driver — see auth/password.ts).
 * Asks for confirmation first. Mirrors scripts/seed-mongo.ts exactly.
 *
 * Run with tsx so it's plain TypeScript, no build step:
 *   npm run dynamo:seed
 */
import { createInterface } from "node:readline/promises";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${message} Type "yes" to continue: `);
  rl.close();
  return answer.trim().toLowerCase() === "yes";
}

async function main() {
  loadEnvLocal();
  // Seeding always targets DynamoDB regardless of the ambient REPOSITORY_DRIVER (e.g. a test run), since there's nothing to seed for the memory driver.
  process.env.REPOSITORY_DRIVER = "dynamo";
  if (!process.env.AWS_REGION) throw new Error("AWS_REGION is required (.env.local).");
  if (!process.env.DYNAMO_TABLE_PREFIX) throw new Error("DYNAMO_TABLE_PREFIX is required (.env.local).");

  const { TABLES } = await import("../src/server/db/dynamo-tables");
  const { tableName, getDynamo, putItem } = await import("../src/server/db/dynamo");
  const { ScanCommand, BatchWriteCommand } = await import("@aws-sdk/lib-dynamodb");
  const { hashPasswordSecure } = await import("../src/server/auth/password");
  const seed1 = await import("../src/server/repositories/in-memory/seed-data");
  const seed2 = await import("../src/server/repositories/in-memory/seed-data-phase2a");
  const dynamo = await import("../src/server/repositories/dynamo/dynamo-repositories");

  console.log(`Target: AWS ${process.env.AWS_REGION}, prefix "${process.env.DYNAMO_TABLE_PREFIX}"`);

  const ok = await confirm(`This will WIPE every row in every "${process.env.DYNAMO_TABLE_PREFIX}-*" table and reseed demo data.`);
  if (!ok) {
    console.log("Aborted — no changes made.");
    process.exit(0);
  }

  const client = getDynamo();
  let wipedTotal = 0;
  for (const key of Object.keys(TABLES) as (keyof typeof TABLES)[]) {
    const table = TABLES[key];
    const TableName = tableName(key);
    let wiped = 0;
    let ExclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const result = await client.send(new ScanCommand({ TableName, ExclusiveStartKey, ProjectionExpression: "#pk", ExpressionAttributeNames: { "#pk": table.pk } }));
      const items = result.Items ?? [];
      // BatchWriteCommand caps at 25 requests per call.
      for (let i = 0; i < items.length; i += 25) {
        const chunk = items.slice(i, i + 25);
        await client.send(
          new BatchWriteCommand({
            RequestItems: { [TableName]: chunk.map((item) => ({ DeleteRequest: { Key: { [table.pk]: item[table.pk] } } })) },
          }),
        );
      }
      wiped += items.length;
      ExclusiveStartKey = result.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    wipedTotal += wiped;
  }
  console.log(`Wiped ${wipedTotal} row(s) across ${Object.keys(TABLES).length} table(s).`);

  // Users — same seed accounts, re-hashed with argon2 (password123 for everyone, matching the documented seeded logins).
  for (const user of seed1.SEED_USERS) {
    const passwordHash = await hashPasswordSecure(seed1.SEED_PASSWORD);
    await new dynamo.DynamoUserRepository().create({ ...user, passwordHash });
  }
  console.log(`Seeded ${seed1.SEED_USERS.length} users.`);

  for (const project of seed1.SEED_PROJECTS) await new dynamo.DynamoProjectRepository().create(project);
  console.log(`Seeded ${seed1.SEED_PROJECTS.length} projects.`);

  // Read-only in the app (no create() method on their repository interfaces) — inserted directly, denormalizing clientId onto each row the same way mongo-repositories' MongoActivityRepository/MongoAttentionRepository derive it from the project at query time.
  const projectClientId = new Map(seed1.SEED_PROJECTS.map((p) => [p.id, p.clientId]));
  for (const activity of seed1.SEED_ACTIVITIES) {
    await putItem("activityItems", { ...activity, clientId: projectClientId.get(activity.projectId) });
  }
  for (const task of seed1.SEED_ATTENTION_TASKS) {
    await putItem("attentionTasks", { ...task, clientId: projectClientId.get(task.projectId) });
  }
  console.log(`Seeded ${seed1.SEED_ACTIVITIES.length} activity items, ${seed1.SEED_ATTENTION_TASKS.length} attention tasks.`);

  for (const v of seed2.SEED_BRIEF_VERSIONS) await new dynamo.DynamoBriefRepository().create(v);
  for (const v of seed2.SEED_PROPOSAL_VERSIONS) await new dynamo.DynamoProposalRepository().create(v);
  for (const r of seed2.SEED_ACCEPTANCE_RECORDS) await new dynamo.DynamoAcceptanceRecordRepository().create(r);
  for (const i of seed2.SEED_INVOICES) await new dynamo.DynamoInvoiceRepository().update(i);
  for (const c of seed2.SEED_COMMENTS) await new dynamo.DynamoCommentRepository().create(c);
  for (const l of seed2.SEED_SHARE_LINKS) await new dynamo.DynamoShareLinkRepository().create(l);
  for (const i of seed2.SEED_CONTENT_CHECKLIST_ITEMS) await new dynamo.DynamoContentChecklistRepository().update(i);
  for (const s of seed2.SEED_CONTENT_SUBMISSIONS) await new dynamo.DynamoContentSubmissionRepository().create(s);
  for (const v of seed2.SEED_DESIGN_VERSIONS) await new dynamo.DynamoDesignVersionRepository().create(v);
  for (const c of seed2.SEED_DESIGN_PIN_COMMENTS) await new dynamo.DynamoDesignPinCommentRepository().create(c);
  for (const r of seed2.SEED_REVISION_ROUNDS) await new dynamo.DynamoRevisionRoundRepository().create(r);
  for (const msg of seed2.SEED_PROJECT_MESSAGES) await new dynamo.DynamoProjectMessageRepository().create(msg);
  for (const n of seed2.SEED_NOTIFICATIONS) await new dynamo.DynamoNotificationRepository().create(n);
  for (const r of seed2.SEED_CONVERSATION_READS) await new dynamo.DynamoConversationReadRepository().upsert(r);
  for (const s of seed2.SEED_CONTACT_STAGES) await new dynamo.DynamoContactStageRepository().create(s);
  for (const c of seed2.SEED_PROJECT_BOARD_COLUMNS) await new dynamo.DynamoProjectBoardColumnRepository().create(c);
  for (const c of seed2.SEED_CONTACTS) await new dynamo.DynamoContactRepository().create(c);
  for (const a of seed2.SEED_CONTACT_ACTIVITIES) await new dynamo.DynamoContactActivityRepository().create(a);
  await new dynamo.DynamoAgencySettingsRepository().update(seed2.SEED_AGENCY_SETTINGS);

  // Uploaded files — metadata to Dynamo, real bytes to local disk (StorageProvider's dev-only backing), same as the memory/mongo drivers' seeding.
  const uploadDir = join(process.cwd(), ".data", "uploads");
  mkdirSync(uploadDir, { recursive: true });
  for (const file of seed2.SEED_UPLOADED_FILES) {
    const path = join(uploadDir, file.storageId);
    if (!existsSync(path)) {
      writeFileSync(path, `${file.originalName}\n\nSeed demo content — not a real upload.\n`, "utf-8");
    }
    await new dynamo.DynamoUploadedFileRepository().create(file);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
