/**
 * npm run db:seed — wipes every collection in MONGODB_URI and reseeds the
 * same demo data the memory driver uses for tests (plus argon2-rehashed
 * passwords, since seed-data.ts's baked-in hash is scrypt, kept only for
 * the memory driver — see auth/password.ts). Asks for confirmation first.
 *
 * Run with tsx so it's plain TypeScript, no build step:
 *   npm run db:seed
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
  // Seeding always targets Mongo regardless of the ambient REPOSITORY_DRIVER
  // (e.g. a test run), since there's nothing to seed for the memory driver.
  process.env.REPOSITORY_DRIVER = "mongo";

  const { getMongoose, assertReplicaSet } = await import("../src/server/db/mongoose");
  const { hashPasswordSecure } = await import("../src/server/auth/password");
  const seed1 = await import("../src/server/repositories/in-memory/seed-data");
  const seed2 = await import("../src/server/repositories/in-memory/seed-data-phase2a");
  const models = await import("../src/server/db/models");
  const mongo = await import("../src/server/repositories/mongo/mongo-repositories");

  const m = await getMongoose();
  console.log(`Connected to ${process.env.MONGODB_URI}`);
  await assertReplicaSet();

  const ok = await confirm(`This will WIPE every collection in ${process.env.MONGODB_URI} and reseed demo data.`);
  if (!ok) {
    console.log("Aborted — no changes made.");
    process.exit(0);
  }

  const db = m.connection.db;
  if (!db) throw new Error("No active database connection.");
  const existingCollections = await db.listCollections().toArray();
  for (const { name } of existingCollections) {
    await db.collection(name).deleteMany({});
  }
  console.log(`Wiped ${existingCollections.length} collection(s).`);

  // Users — same seed accounts, re-hashed with argon2 (password123 for everyone, matching the documented seeded logins).
  for (const user of seed1.SEED_USERS) {
    const passwordHash = await hashPasswordSecure(seed1.SEED_PASSWORD);
    await new mongo.MongoUserRepository().create({ ...user, passwordHash });
  }
  console.log(`Seeded ${seed1.SEED_USERS.length} users.`);

  for (const project of seed1.SEED_PROJECTS) await new mongo.MongoProjectRepository().create(project);
  console.log(`Seeded ${seed1.SEED_PROJECTS.length} projects.`);

  // Read-only in the app (never mutated by any service) — inserted directly, no dedicated repo create() method.
  await models.ActivityItemModel.insertMany(seed1.SEED_ACTIVITIES.map((a) => ({ _id: a.id, ...omit(a, "id") })));
  await models.AttentionTaskModel.insertMany(seed1.SEED_ATTENTION_TASKS.map((t) => ({ _id: t.id, ...omit(t, "id") })));
  console.log(`Seeded ${seed1.SEED_ACTIVITIES.length} activity items, ${seed1.SEED_ATTENTION_TASKS.length} attention tasks.`);

  for (const v of seed2.SEED_BRIEF_VERSIONS) await new mongo.MongoBriefRepository().create(v);
  for (const v of seed2.SEED_PROPOSAL_VERSIONS) await new mongo.MongoProposalRepository().create(v);
  for (const r of seed2.SEED_ACCEPTANCE_RECORDS) await new mongo.MongoAcceptanceRecordRepository().create(r);
  for (const i of seed2.SEED_INVOICES) await new mongo.MongoInvoiceRepository().update(i);
  for (const c of seed2.SEED_COMMENTS) await new mongo.MongoCommentRepository().create(c);
  for (const l of seed2.SEED_SHARE_LINKS) await new mongo.MongoShareLinkRepository().create(l);
  for (const i of seed2.SEED_CONTENT_CHECKLIST_ITEMS) await models.ContentChecklistItemModel.create({ _id: i.id, ...omit(i, "id") });
  for (const s of seed2.SEED_CONTENT_SUBMISSIONS) await new mongo.MongoContentSubmissionRepository().create(s);
  for (const v of seed2.SEED_DESIGN_VERSIONS) await new mongo.MongoDesignVersionRepository().create(v);
  for (const c of seed2.SEED_DESIGN_PIN_COMMENTS) await new mongo.MongoDesignPinCommentRepository().create(c);
  for (const r of seed2.SEED_REVISION_ROUNDS) await new mongo.MongoRevisionRoundRepository().create(r);
  for (const msg of seed2.SEED_PROJECT_MESSAGES) await new mongo.MongoProjectMessageRepository().create(msg);
  for (const n of seed2.SEED_NOTIFICATIONS) await new mongo.MongoNotificationRepository().create(n);
  for (const r of seed2.SEED_CONVERSATION_READS) await new mongo.MongoConversationReadRepository().upsert(r);
  for (const s of seed2.SEED_CONTACT_STAGES) await new mongo.MongoContactStageRepository().create(s);
  for (const c of seed2.SEED_CONTACTS) await new mongo.MongoContactRepository().create(c);
  for (const a of seed2.SEED_CONTACT_ACTIVITIES) await new mongo.MongoContactActivityRepository().create(a);
  await new mongo.MongoAgencySettingsRepository().update(seed2.SEED_AGENCY_SETTINGS);

  // Uploaded files — metadata to Mongo, real bytes to local disk (StorageProvider's dev-only backing), same as the memory driver's seeding.
  const uploadDir = join(process.cwd(), ".data", "uploads");
  mkdirSync(uploadDir, { recursive: true });
  for (const file of seed2.SEED_UPLOADED_FILES) {
    const path = join(uploadDir, file.storageId);
    if (!existsSync(path)) {
      writeFileSync(path, `${file.originalName}\n\nSeed demo content — not a real upload.\n`, "utf-8");
    }
    await new mongo.MongoUploadedFileRepository().create(file);
  }

  console.log("Done.");
  await m.disconnect();
}

function omit<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const { [key]: _omitted, ...rest } = obj;
  return rest;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
