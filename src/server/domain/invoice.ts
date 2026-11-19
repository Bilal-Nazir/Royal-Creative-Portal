/**
 * "scheduled" — created from the proposal's payment schedule but not yet
 * due (e.g. the final payment, which only becomes due at the launch stage).
 * Distinct from "unpaid" (due now, awaiting payment).
 */
export type InvoiceStatus = "scheduled" | "unpaid" | "promised" | "unverified" | "partially_paid" | "paid" | "overdue";
export type InvoiceType = "deposit" | "progress" | "final" | "additional";

export interface Invoice {
  id: string;
  projectId: string;
  type: InvoiceType;
  invoiceNumber: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
  /** Set by R11 "choose payment date" — a client promise, not a payment. */
  promisedDate?: string;
  paidAt?: string;
  paymentMethod?: string;
  lastFailureReason?: string;
  /** Set when an admin manually verifies a client-reported ("unverified") transfer. */
  verifiedByUserId?: string;
  verifiedByName?: string;
  verifiedAt?: string;
}

/**
 * Decision: only a Stripe-confirmed charge or an admin verification counts as
 * "confirmed" for the deposit -> content stage gate. A client self-reporting a
 * transfer ("unverified") does not.
 */
export function isInvoiceConfirmed(invoice: Invoice): boolean {
  return invoice.status === "paid";
}
