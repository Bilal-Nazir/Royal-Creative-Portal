import type { ClientSession } from "mongoose";
import { invoiceRepository, projectRepository } from "../repositories/container";
import { paymentProvider } from "../payments/mock-provider";
import { assertClientCanActOnProject, assertAgencyCanManageProject } from "./permissions";
import { ok, badRequest, notFound, type ServiceResult } from "./result";
import { tryAdvanceStageIfGated } from "./stage-service";
import type { SessionPayload } from "../auth/session";
import type { Invoice, InvoiceStatus, InvoiceType } from "../domain/invoice";
import type { Project } from "../domain/project";
import type { PaymentScheduleItem } from "../domain/proposal";

export async function getDepositInvoice(projectId: string): Promise<Invoice | null> {
  return invoiceRepository.getDepositInvoice(projectId);
}

/** Launch's final payment (no Figma screen — see DESIGN_NOTES for the logged deviation reusing the deposit checkout pattern). */
export async function getFinalInvoice(projectId: string): Promise<Invoice | null> {
  const invoices = await invoiceRepository.listByProjectId(projectId);
  return invoices.find((i) => i.type === "final") ?? null;
}

/**
 * Centralizes "a final invoice was just marked paid -> tick the launch
 * checklist's Final payment check" so every paid-marking path (the final
 * checkout below, manual marking, and A07's generic setInvoiceStatus) drives
 * the same checklist state. Idempotent: a no-op if already ticked, so this
 * can be called from multiple paid-marking paths without side effects piling
 * up or the launch gate flickering.
 */
async function tickFinalPaymentIfApplicable(invoice: Invoice, project: Project): Promise<Project> {
  if (invoice.type !== "final" || project.launchChecklist.finalPayment) return project;
  const updated: Project = { ...project, launchChecklist: { ...project.launchChecklist, finalPayment: true } };
  await projectRepository.update(updated);
  return updated;
}

/**
 * Called once a proposal is accepted — turns its payment schedule into real
 * invoices so the deposit stage (and everything after it) has something to
 * pay. The first row is the deposit: due immediately. The last row is the
 * final payment: created as "scheduled" (not yet due) until the project
 * reaches the launch stage — see activateScheduledInvoices. Any rows between
 * the two (schedules longer than 2 rows) are "progress" invoices, also
 * created scheduled; nothing currently built activates them, since every
 * schedule produced by the proposal editor only ever has 2 rows.
 *
 * Idempotent: checks for an existing invoice of each type on this project
 * before creating one, so accepting the same proposal twice (or any other
 * repeat call) never creates duplicates.
 */
export async function createInvoicesFromPaymentSchedule(
  projectId: string,
  schedule: PaymentScheduleItem[],
  session?: ClientSession | null,
): Promise<void> {
  if (schedule.length === 0) return;

  const existing = await invoiceRepository.listByProjectId(projectId);
  const hasType = (type: InvoiceType) => existing.some((i) => i.type === type);
  const created: Invoice[] = [];
  const nextInvoiceNumber = () => `RC-${1100 + existing.length + created.length}`;

  const dueNow = new Date().toISOString().slice(0, 10);

  if (!hasType("deposit")) {
    created.push({
      id: `inv-${projectId}-deposit`,
      projectId,
      type: "deposit",
      invoiceNumber: nextInvoiceNumber(),
      amount: schedule[0].amount,
      status: "unpaid",
      dueDate: dueNow,
    });
  }

  for (let i = 1; i < schedule.length; i++) {
    const isLast = i === schedule.length - 1;
    const type: InvoiceType = isLast ? "final" : "progress";
    if (hasType(type)) continue;
    created.push({
      id: `inv-${projectId}-${type}`,
      projectId,
      type,
      invoiceNumber: nextInvoiceNumber(),
      amount: schedule[i].amount,
      status: "scheduled",
      // Placeholder until activateScheduledInvoices sets the real due date —
      // Invoice.dueDate is required, and "not due yet" is expressed by
      // status === "scheduled", not by an empty/missing date.
      dueDate: dueNow,
    });
  }

  for (const invoice of created) {
    await invoiceRepository.update(invoice, session);
  }
}

/**
 * See activateScheduledInvoices in stage-service.ts for the "final invoice
 * becomes due at launch" half of this — it lives there, not here, to avoid
 * a circular import (invoice-service -> stage-service -> invoice-service).
 */

export interface PayDepositOutcome {
  invoice: Invoice;
  charged: boolean;
  errorMessage?: string;
}

/** The demo outcome ('success' | 'failure') comes from the checkout screen's demo control — see MockPaymentProvider. */
export async function payDeposit(
  session: SessionPayload,
  projectId: string,
  simulateOutcome: "success" | "failure",
): Promise<ServiceResult<PayDepositOutcome>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertClientCanActOnProject<PayDepositOutcome>(session, project);
  if (denied) return denied;

  const invoice = await invoiceRepository.getDepositInvoice(projectId);
  if (!invoice) return notFound("Deposit invoice not found.");

  const result = await paymentProvider.charge({
    amount: invoice.amount,
    description: `Deposit for ${project.name}`,
    simulateOutcome,
  });

  if (result.ok) {
    const updated: Invoice = {
      ...invoice,
      status: "paid",
      paidAt: new Date().toISOString(),
      paymentMethod: "card",
      lastFailureReason: undefined,
    };
    await invoiceRepository.update(updated);
    await tryAdvanceStageIfGated(project);
    return ok({ invoice: updated, charged: true });
  }

  const updated: Invoice = { ...invoice, lastFailureReason: result.errorMessage };
  await invoiceRepository.update(updated);
  return ok({ invoice: updated, charged: false, errorMessage: result.errorMessage });
}

export interface PayFinalInvoiceOutcome {
  invoice: Invoice;
  charged: boolean;
  errorMessage?: string;
}

/** Final balance checkout (deviation: reuses the C08/C09/C10 deposit checkout pattern — no Figma screen for this). */
export async function payFinalInvoice(
  session: SessionPayload,
  projectId: string,
  simulateOutcome: "success" | "failure",
): Promise<ServiceResult<PayFinalInvoiceOutcome>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertClientCanActOnProject<PayFinalInvoiceOutcome>(session, project);
  if (denied) return denied;

  const invoice = await getFinalInvoice(projectId);
  if (!invoice) return notFound("Final invoice not found.");
  if (invoice.status === "scheduled") return badRequest("The final invoice is not due yet.");

  const result = await paymentProvider.charge({
    amount: invoice.amount,
    description: `Final balance for ${project.name}`,
    simulateOutcome,
  });

  if (result.ok) {
    const updated: Invoice = {
      ...invoice,
      status: "paid",
      paidAt: new Date().toISOString(),
      paymentMethod: "card",
      lastFailureReason: undefined,
    };
    await invoiceRepository.update(updated);
    const updatedProject = await tickFinalPaymentIfApplicable(updated, project);
    await tryAdvanceStageIfGated(updatedProject);
    return ok({ invoice: updated, charged: true });
  }

  const updated: Invoice = { ...invoice, lastFailureReason: result.errorMessage };
  await invoiceRepository.update(updated);
  return ok({ invoice: updated, charged: false, errorMessage: result.errorMessage });
}

/** Agency-only: records a final-balance transfer received outside the mock checkout. */
export async function markFinalInvoicePaidManually(session: SessionPayload, projectId: string): Promise<ServiceResult<Invoice>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<Invoice>(session, project);
  if (denied) return denied;

  const invoice = await getFinalInvoice(projectId);
  if (!invoice) return notFound("Final invoice not found.");

  const updated: Invoice = {
    ...invoice,
    status: "paid",
    paidAt: new Date().toISOString(),
    paymentMethod: "manual",
    verifiedByUserId: session.userId,
    verifiedByName: session.name,
    verifiedAt: new Date().toISOString(),
  };
  await invoiceRepository.update(updated);
  const updatedProject = await tickFinalPaymentIfApplicable(updated, project);
  await tryAdvanceStageIfGated(updatedProject);
  return ok(updated);
}

/** R11 — a client promise to pay by a future date. Does not satisfy the deposit -> content gate. */
export async function choosePaymentDate(
  session: SessionPayload,
  projectId: string,
  promisedDate: string,
): Promise<ServiceResult<Invoice>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertClientCanActOnProject<Invoice>(session, project);
  if (denied) return denied;

  const invoice = await invoiceRepository.getDepositInvoice(projectId);
  if (!invoice) return notFound("Deposit invoice not found.");

  const updated: Invoice = { ...invoice, status: "promised", promisedDate };
  await invoiceRepository.update(updated);
  return ok(updated);
}

/** Agency-only: marks a client-reported ("unverified") transfer as confirmed. Does satisfy the gate once applied. */
export async function verifyInvoicePayment(session: SessionPayload, projectId: string): Promise<ServiceResult<Invoice>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<Invoice>(session, project);
  if (denied) return denied;

  const invoice = await invoiceRepository.getDepositInvoice(projectId);
  if (!invoice) return notFound("Deposit invoice not found.");

  const updated: Invoice = {
    ...invoice,
    status: "paid",
    verifiedByUserId: session.userId,
    verifiedByName: session.name,
    verifiedAt: new Date().toISOString(),
  };
  await invoiceRepository.update(updated);
  await tryAdvanceStageIfGated(project);
  return ok(updated);
}

/** A08 — "Mark as paid manually": agency records a transfer received outside Stripe, with no prior client self-report. */
export async function markInvoicePaidManually(session: SessionPayload, projectId: string): Promise<ServiceResult<Invoice>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<Invoice>(session, project);
  if (denied) return denied;

  const invoice = await invoiceRepository.getDepositInvoice(projectId);
  if (!invoice) return notFound("Deposit invoice not found.");

  const updated: Invoice = {
    ...invoice,
    status: "paid",
    paidAt: new Date().toISOString(),
    paymentMethod: "manual",
    verifiedByUserId: session.userId,
    verifiedByName: session.name,
    verifiedAt: new Date().toISOString(),
  };
  await invoiceRepository.update(updated);
  await tryAdvanceStageIfGated(project);
  return ok(updated);
}

/** A07's "⋯" quick-action menu (161:587) — a direct status override, distinct from the guarded paid/verify flows above. */
export async function setInvoiceStatus(
  session: SessionPayload,
  invoiceId: string,
  status: InvoiceStatus,
): Promise<ServiceResult<Invoice>> {
  const invoice = await invoiceRepository.findById(invoiceId);
  if (!invoice) return notFound("Invoice not found.");

  const project = await projectRepository.findById(invoice.projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<Invoice>(session, project);
  if (denied) return denied;

  const updated: Invoice = {
    ...invoice,
    status,
    ...(status === "paid" ? { paidAt: new Date().toISOString() } : {}),
  };
  await invoiceRepository.update(updated);
  if (status === "paid") {
    const updatedProject = await tickFinalPaymentIfApplicable(updated, project);
    await tryAdvanceStageIfGated(updatedProject);
  }
  return ok(updated);
}

export interface InvoiceWithProject {
  invoice: Invoice;
  project: Project;
}

/** A07's invoice list — every invoice joined with its project, newest due date first. */
export async function listAllInvoicesWithProject(): Promise<InvoiceWithProject[]> {
  const [invoices, projects] = await Promise.all([invoiceRepository.listAll(), projectRepository.listAll()]);
  const projectById = new Map(projects.map((p) => [p.id, p]));
  return invoices
    .map((invoice) => {
      const project = projectById.get(invoice.projectId);
      return project ? { invoice, project } : null;
    })
    .filter((row): row is InvoiceWithProject => row !== null)
    .sort((a, b) => new Date(a.invoice.dueDate).getTime() - new Date(b.invoice.dueDate).getTime());
}

/** Client Payments nav page (Phase 3, no Figma frame) — every invoice on this client's own projects only. */
export async function listInvoicesForClient(clientId: string): Promise<InvoiceWithProject[]> {
  const rows = await listAllInvoicesWithProject();
  return rows.filter((row) => row.project.clientId === clientId);
}

export interface PaymentMetrics {
  collected: number;
  outstanding: number;
  overdue: number;
  awaitingVerification: number;
}

/**
 * Figma's mock shows "vs last month" deltas on these cards — there's no
 * historical data to compute a real delta from (our seed has no payment
 * history table), so this only returns the real current totals. See
 * DESIGN_NOTES for the logged deviation.
 */
export function computePaymentMetrics(invoices: Invoice[]): PaymentMetrics {
  const outstandingStatuses: InvoiceStatus[] = ["unpaid", "promised", "unverified", "partially_paid", "overdue"];
  return {
    collected: invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.amount, 0),
    outstanding: invoices.filter((i) => outstandingStatuses.includes(i.status)).reduce((sum, i) => sum + i.amount, 0),
    overdue: invoices.filter((i) => i.status === "overdue").reduce((sum, i) => sum + i.amount, 0),
    awaitingVerification: invoices.filter((i) => i.status === "unverified").length,
  };
}
