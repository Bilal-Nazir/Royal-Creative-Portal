import { describe, expect, it } from "vitest";
import { isInvoiceConfirmed, type Invoice, type InvoiceStatus } from "./invoice";

function invoiceWithStatus(status: InvoiceStatus): Invoice {
  return {
    id: "inv-1",
    projectId: "proj-1",
    type: "deposit",
    invoiceNumber: "RC-0001",
    amount: 1200,
    status,
    dueDate: "2026-11-05",
  };
}

describe("isInvoiceConfirmed", () => {
  it("is true only for status 'paid'", () => {
    expect(isInvoiceConfirmed(invoiceWithStatus("paid"))).toBe(true);
  });

  // Decision 1: a client-reported ("unverified") transfer must NOT count as confirmed.
  it("is false for 'unverified' — a client self-report is not a confirmation", () => {
    expect(isInvoiceConfirmed(invoiceWithStatus("unverified"))).toBe(false);
  });

  it("is false for every other status", () => {
    const statuses: InvoiceStatus[] = ["unpaid", "promised", "partially_paid", "overdue"];
    for (const status of statuses) {
      expect(isInvoiceConfirmed(invoiceWithStatus(status))).toBe(false);
    }
  });

  it("becomes true once an admin verification sets status to 'paid'", () => {
    const verified: Invoice = {
      ...invoiceWithStatus("paid"),
      verifiedByUserId: "u-jerry",
      verifiedByName: "Jerry Royal",
      verifiedAt: "2026-11-03T09:00:00.000Z",
    };
    expect(isInvoiceConfirmed(verified)).toBe(true);
  });
});
