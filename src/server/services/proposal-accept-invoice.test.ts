import { afterEach, describe, expect, it } from "vitest";
import { acceptProposal } from "./proposal-service";
import { getDepositInvoice } from "./invoice-service";
import { activateScheduledInvoices } from "./stage-service";
import { invoiceRepository } from "../repositories/container";
import { resetStore } from "../repositories/in-memory/memory-store";
import type { SessionPayload } from "../auth/session";

/**
 * Regression: a project whose proposal is accepted for the first time must
 * end up with invoices for its whole payment schedule — without this, the
 * deposit stage has nothing for the client to pay, and the final payment is
 * never captured at all. See createInvoicesFromPaymentSchedule
 * (invoice-service.ts) and activateScheduledInvoices (stage-service.ts).
 */

const ASHWORTH_PROJECT_ID = "proj-ashworth";
const ROYAL_TRENDSY_PROJECT_ID = "proj-royal-trendsy";

const ashworthParticipant: SessionPayload = {
  userId: "u-clara",
  role: "client",
  name: "Clara Ashworth",
  clientRole: "participant",
  clientId: "ashworth-chambers",
};

const royalTrendsyParticipant: SessionPayload = {
  userId: "u-alex",
  role: "client",
  name: "Alex",
  clientRole: "participant",
  clientId: "royal-trendsy",
};

describe("acceptProposal creates invoices from the payment schedule", () => {
  afterEach(() => {
    resetStore();
  });

  it("creates a deposit invoice (due now) and a final invoice (scheduled) from a 2-row schedule", async () => {
    expect(await invoiceRepository.listByProjectId(ASHWORTH_PROJECT_ID)).toHaveLength(0);

    const result = await acceptProposal(ashworthParticipant, ASHWORTH_PROJECT_ID);
    expect(result.ok).toBe(true);

    const invoices = await invoiceRepository.listByProjectId(ASHWORTH_PROJECT_ID);
    expect(invoices).toHaveLength(2);

    const deposit = invoices.find((i) => i.type === "deposit");
    expect(deposit?.status).toBe("unpaid");
    expect(deposit?.amount).toBe(1600); // proposal-ashworth-v1's first schedule row

    const final = invoices.find((i) => i.type === "final");
    expect(final?.status).toBe("scheduled");
    expect(final?.amount).toBe(1600); // proposal-ashworth-v1's second schedule row
  });

  it("does not create duplicates when the same proposal is accepted twice", async () => {
    await acceptProposal(ashworthParticipant, ASHWORTH_PROJECT_ID);
    const afterFirst = await invoiceRepository.listByProjectId(ASHWORTH_PROJECT_ID);
    expect(afterFirst).toHaveLength(2);

    await acceptProposal(ashworthParticipant, ASHWORTH_PROJECT_ID);
    const afterSecond = await invoiceRepository.listByProjectId(ASHWORTH_PROJECT_ID);

    expect(afterSecond).toHaveLength(2);
    expect(afterSecond.map((i) => i.id).sort()).toEqual(afterFirst.map((i) => i.id).sort());
  });

  it("does not duplicate or overwrite a deposit invoice that already exists", async () => {
    const before = await getDepositInvoice(ROYAL_TRENDSY_PROJECT_ID);
    expect(before).not.toBeNull();

    await acceptProposal(royalTrendsyParticipant, ROYAL_TRENDSY_PROJECT_ID);

    const after = await getDepositInvoice(ROYAL_TRENDSY_PROJECT_ID);
    expect(after?.id).toBe(before?.id);
    expect(after?.status).toBe(before?.status);
  });
});

describe("activateScheduledInvoices", () => {
  afterEach(() => {
    resetStore();
  });

  it("flips a scheduled invoice to unpaid, due now, and leaves other invoices alone", async () => {
    await acceptProposal(ashworthParticipant, ASHWORTH_PROJECT_ID);
    const before = await invoiceRepository.listByProjectId(ASHWORTH_PROJECT_ID);
    const scheduledBefore = before.find((i) => i.type === "final");
    expect(scheduledBefore?.status).toBe("scheduled");
    const depositBefore = before.find((i) => i.type === "deposit");

    await activateScheduledInvoices(ASHWORTH_PROJECT_ID);

    const after = await invoiceRepository.listByProjectId(ASHWORTH_PROJECT_ID);
    const finalAfter = after.find((i) => i.type === "final");
    const depositAfter = after.find((i) => i.type === "deposit");

    expect(finalAfter?.status).toBe("unpaid");
    expect(finalAfter?.dueDate).toBe(new Date().toISOString().slice(0, 10));
    // The deposit invoice (already due, not "scheduled") is untouched.
    expect(depositAfter).toEqual(depositBefore);
  });

  it("is a no-op when there's nothing scheduled", async () => {
    const before = await getDepositInvoice(ROYAL_TRENDSY_PROJECT_ID);
    await activateScheduledInvoices(ROYAL_TRENDSY_PROJECT_ID);
    const after = await getDepositInvoice(ROYAL_TRENDSY_PROJECT_ID);
    expect(after).toEqual(before);
  });
});
