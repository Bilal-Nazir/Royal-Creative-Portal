import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

/**
 * Repository tests against the local Mongo *test* database (MONGODB_URI in
 * vitest.config.ts points at `rc_portal_test`, never the dev database) —
 * item 5 of Phase 4a. Requires a reachable local MongoDB; skips entirely
 * (not a failure) when none is running, since this repo's dev environment
 * doesn't always have it started. Drops the whole test database in
 * afterAll, so repeated runs never accumulate stale documents.
 */
const TEST_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/rc_portal_test";

let mongoAvailable = true;
try {
  const probe = await mongoose.createConnection(TEST_URI, { serverSelectionTimeoutMS: 2000 }).asPromise();
  await probe.close();
} catch {
  mongoAvailable = false;
}

describe.skipIf(!mongoAvailable)("Mongo repositories (requires a local MongoDB on MONGODB_URI)", () => {
  let repos: typeof import("./mongo-repositories");
  let models: typeof import("../../db/models");

  beforeAll(async () => {
    repos = await import("./mongo-repositories");
    models = await import("../../db/models");
  });

  afterEach(async () => {
    const db = mongoose.connection.db;
    if (db) {
      const collections = await db.listCollections().toArray();
      for (const { name } of collections) await db.collection(name).deleteMany({});
    }
  });

  afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
  });

  it("User: create + findByEmail round-trips, email is unique", async () => {
    const repo = new repos.MongoUserRepository();
    await repo.create({
      id: "u-test-1",
      role: "agency",
      agencyRole: "member",
      name: "Test User",
      email: "repo-test@example.com",
      passwordHash: "hash",
    });

    const found = await repo.findByEmail("repo-test@example.com");
    expect(found?.id).toBe("u-test-1");

    await expect(
      repo.create({
        id: "u-test-2",
        role: "agency",
        agencyRole: "member",
        name: "Duplicate Email",
        email: "repo-test@example.com",
        passwordHash: "hash",
      }),
    ).rejects.toThrow();
  });

  it("Project: create + findById + listByClientId, with every field round-tripping as plain values (no leaked _id/__v)", async () => {
    const repo = new repos.MongoProjectRepository();
    const project = {
      id: "proj-repo-test",
      name: "Repo test project",
      description: "desc",
      projectType: "Website development" as const,
      createdAt: new Date().toISOString(),
      clientId: "client-repo-test",
      clientName: "Repo Test Client",
      contactName: "Contact",
      stage: "brief" as const,
      statusLabel: "Brief in progress",
      clientStatusLabel: "In progress",
      waitingOn: "agency" as const,
      assigneeId: "u-test-1",
      assigneeName: "Test User",
      dueDate: "2026-12-01",
      openRevisions: 0,
      nextMilestone: { label: "Brief review", date: "2026-12-01", waitingOn: "agency" as const },
      launchChecklist: { clientApproval: false, finalPayment: false, domainHosting: false, qualityChecks: false },
      forcedAdvances: [],
    };
    await repo.create(project);

    const found = await repo.findById("proj-repo-test");
    expect(found).toEqual(project);
    expect(found).not.toHaveProperty("_id");
    expect(found).not.toHaveProperty("__v");

    const byClient = await repo.listByClientId("client-repo-test");
    expect(byClient.map((p) => p.id)).toEqual(["proj-repo-test"]);
  });

  it("Invoice: invoiceNumber is unique, update() upserts (matching the memory driver's push-or-replace semantics)", async () => {
    const repo = new repos.MongoInvoiceRepository();
    const invoiceA = {
      id: "inv-repo-test-a",
      projectId: "proj-repo-test",
      type: "deposit" as const,
      invoiceNumber: "RC-9001",
      amount: 100,
      status: "unpaid" as const,
      dueDate: "2026-12-01",
    };
    await repo.update(invoiceA); // upsert — no pre-existing doc

    const found = await repo.findById("inv-repo-test-a");
    expect(found?.status).toBe("unpaid");

    // Same id, different fields — upsert replaces in place, not a second document.
    await repo.update({ ...invoiceA, status: "paid" });
    const all = await repo.listByProjectId("proj-repo-test");
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("paid");

    await expect(
      models.InvoiceModel.create({
        _id: "inv-repo-test-b",
        projectId: "proj-repo-test",
        type: "final",
        invoiceNumber: "RC-9001", // duplicate invoiceNumber — must violate the unique index
        amount: 50,
        status: "scheduled",
        dueDate: "2026-12-01",
      }),
    ).rejects.toThrow();
  });

  it("ShareLink: token is unique, has no `id` field (matches the domain type)", async () => {
    const repo = new repos.MongoShareLinkRepository();
    await repo.create({
      token: "share-repo-test-token",
      projectId: "proj-repo-test",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60).toISOString(),
    });

    const found = await repo.findByToken("share-repo-test-token");
    expect(found).not.toHaveProperty("id");
    expect(found).not.toHaveProperty("_id");

    await expect(
      models.ShareLinkModel.create({
        token: "share-repo-test-token",
        projectId: "proj-other",
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
      }),
    ).rejects.toThrow();
  });

  it("Invite: tokenHash is unique; findByTokenHash round-trips", async () => {
    const repo = new repos.MongoInviteRepository();
    await repo.create({
      id: "invite-repo-test",
      tokenHash: "hash-repo-test",
      kind: "team",
      email: "invitee@example.com",
      name: "Invitee",
      agencyRole: "member",
      invitedByUserId: "u-test-1",
      invitedByName: "Test User",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    });

    const found = await repo.findByTokenHash("hash-repo-test");
    expect(found?.email).toBe("invitee@example.com");

    await expect(
      models.InviteModel.create({
        _id: "invite-repo-test-2",
        tokenHash: "hash-repo-test",
        kind: "team",
        email: "other@example.com",
        name: "Other",
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
      }),
    ).rejects.toThrow();
  });
});
