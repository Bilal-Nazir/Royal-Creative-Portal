import { invoiceRepository, projectRepository } from "../repositories/container";
import { paymentProvider } from "../payments/mock-provider";
import { assertClientCanActOnProject, assertAgencyCanManageProject } from "./permissions";
import { ok, notFound, type ServiceResult } from "./result";
import { tryAdvanceStageIfGated } from "./stage-service";
import type { SessionPayload } from "../auth/session";
import type { Invoice } from "../domain/invoice";

export async function getDepositInvoice(projectId: string): Promise<Invoice | null> {
  return invoiceRepository.getDepositInvoice(projectId);
}

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
