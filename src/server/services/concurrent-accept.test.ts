import { afterEach, describe, expect, it } from "vitest";
import { acceptProposal } from "./proposal-service";
import { acceptScopeChange, createScopeChange } from "./scope-change-service";
import { invoiceRepository } from "../repositories/container";
import { resetStore } from "../repositories/in-memory/memory-store";
import type { SessionPayload } from "../auth/session";

/**
 * "No duplicate invoices under concurrent accept" (item 5). Runs against
 * the memory driver with two concurrent calls via Promise.all — real
 * cross-process concurrency additionally relies on the Mongo transaction
 * wrapping in acceptProposal/acceptScopeChange (see DESIGN_NOTES), which
 * can't be exercised here without a live replica-set Mongo. What this test
 * does verify, on any driver: invoice ids are deterministic
 * (`inv-{projectId}-{type}`), so even an interleaved double-write produces
 * one document per type, not two.
 */

const PROJECT_ID = "proj-royal-trendsy";
const clientParticipant: SessionPayload = { userId: "u-alex", role: "client", name: "Alex", clientRole: "participant", clientId: "royal-trendsy" };
const agencyOwner: SessionPayload = { userId: "u-jerry", role: "agency", name: "Jerry Royal", agencyRole: "owner" };

afterEach(() => resetStore());

describe("acceptProposal under concurrent calls", () => {
  it("creates exactly one deposit and one final invoice, never two", async () => {
    const [first, second] = await Promise.all([
      acceptProposal(clientParticipant, PROJECT_ID),
      acceptProposal(clientParticipant, PROJECT_ID),
    ]);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    const invoices = await invoiceRepository.listByProjectId(PROJECT_ID);
    const deposits = invoices.filter((i) => i.type === "deposit");
    const finals = invoices.filter((i) => i.type === "final");
    expect(deposits).toHaveLength(1);
    expect(finals).toHaveLength(1);
  });
});

describe("acceptScopeChange under concurrent calls", () => {
  // The memory driver has no transaction serialization (it's a test-only
  // driver — see db/mongoose.ts's withTransaction), so this doesn't assert
  // "only one call succeeds" (that mutual exclusion is what the real Mongo
  // transaction provides and needs a live replica set to exercise). What
  // holds on any driver: the additional invoice's id is deterministic
  // (`inv-{projectId}-additional-{scopeChangeId}`), so even two racing
  // writes land on the same document — never two.
  it("never creates two additional invoices for the same scope change", async () => {
    const created = await createScopeChange(agencyOwner, PROJECT_ID, {
      title: "Concurrent test scope change",
      description: "Extra pages",
      additionalFee: 400,
      timelineImpact: "+3 days",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await Promise.all([
      acceptScopeChange(clientParticipant, PROJECT_ID, created.data.id),
      acceptScopeChange(clientParticipant, PROJECT_ID, created.data.id),
    ]);

    const invoices = await invoiceRepository.listByProjectId(PROJECT_ID);
    const additional = invoices.filter((i) => i.type === "additional" && i.id === `inv-${PROJECT_ID}-additional-${created.data.id}`);
    expect(additional).toHaveLength(1);
  });
});
