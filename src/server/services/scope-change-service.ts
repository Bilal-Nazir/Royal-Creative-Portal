import { scopeChangeRepository, projectRepository, invoiceRepository } from "../repositories/container";
import { withTransaction } from "../db/transaction";
import { assertClientCanActOnProject, assertAgencyCanManageProject } from "./permissions";
import { ok, badRequest, notFound, type ServiceResult } from "./result";
import { notifyAgency, notifyClient } from "./notification-service";
import type { SessionPayload } from "../auth/session";
import type { ScopeChange } from "../domain/scope-change";
import type { Invoice } from "../domain/invoice";

export async function getScopeChanges(projectId: string): Promise<ScopeChange[]> {
  return scopeChangeRepository.listByProjectId(projectId);
}

export interface CreateScopeChangeInput {
  title: string;
  description: string;
  additionalFee: number;
  timelineImpact: string;
  flaggedFromRoundId?: string;
}

/** R09 (client review) — created by the agency from R04/R18's "Flag for scope decision" or from project detail (A16). */
export async function createScopeChange(
  session: SessionPayload,
  projectId: string,
  input: CreateScopeChangeInput,
): Promise<ServiceResult<ScopeChange>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<ScopeChange>(session, project);
  if (denied) return denied;

  if (!input.title.trim()) return badRequest("Give this scope change a title.");
  if (!input.description.trim()) return badRequest("Describe the requested addition.");
  if (input.additionalFee < 0) return badRequest("Additional fee can't be negative.");

  const scopeChange: ScopeChange = {
    id: `scope-change-${projectId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    projectId,
    title: input.title.trim(),
    description: input.description.trim(),
    additionalFee: input.additionalFee,
    timelineImpact: input.timelineImpact,
    status: "pending",
    flaggedFromRoundId: input.flaggedFromRoundId,
    createdByName: session.name,
    createdAt: new Date().toISOString(),
  };
  await scopeChangeRepository.create(scopeChange);
  await notifyClient(projectId, "scope_change_sent", "A request beyond the agreed scope", `${session.name} sent a scope change for review: ${scopeChange.title}.`);
  return ok(scopeChange);
}

/**
 * R09 "Approve scope change" — records acceptance and creates a separate
 * "additional work" invoice. Existing work continues either way. The
 * pending-status check and the writes all run inside one transaction, so a
 * concurrent double-accept either both land (the invoice id is
 * deterministic per scope change, so a retried write is a no-op) or the
 * loser's transaction retries against the post-commit "already decided"
 * state and correctly returns badRequest instead of double-invoicing.
 */
export async function acceptScopeChange(session: SessionPayload, projectId: string, scopeChangeId: string): Promise<ServiceResult<ScopeChange>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertClientCanActOnProject<ScopeChange>(session, project);
  if (denied) return denied;

  const outcome = await withTransaction(async (txSession) => {
    const scopeChange = await scopeChangeRepository.findById(scopeChangeId);
    if (!scopeChange || scopeChange.projectId !== projectId) return notFound<ScopeChange>("Scope change not found.");
    if (scopeChange.status !== "pending") return badRequest<ScopeChange>("This scope change has already been decided.");

    const existingInvoices = await invoiceRepository.listByProjectId(projectId);
    const invoiceNumber = `RC-${1100 + existingInvoices.length}`;
    const invoice: Invoice = {
      id: `inv-${projectId}-additional-${scopeChange.id}`,
      projectId,
      type: "additional",
      invoiceNumber,
      amount: scopeChange.additionalFee,
      status: "unpaid",
      dueDate: new Date().toISOString().slice(0, 10),
    };
    await invoiceRepository.update(invoice, txSession);

    const updated: ScopeChange = {
      ...scopeChange,
      status: "accepted",
      decidedByUserId: session.userId,
      decidedByName: session.name,
      decidedAt: new Date().toISOString(),
      additionalInvoiceId: invoice.id,
    };
    await scopeChangeRepository.update(updated, txSession);
    await notifyAgency(projectId, "scope_change_accepted", "Scope change accepted", `${session.name} accepted "${scopeChange.title}".`, txSession);
    return ok(updated);
  });
  return outcome;
}

/** R09 "Discuss request" — declines the optional addition; the decision is recorded but nothing about the current stage changes. */
export async function declineScopeChange(session: SessionPayload, projectId: string, scopeChangeId: string): Promise<ServiceResult<ScopeChange>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertClientCanActOnProject<ScopeChange>(session, project);
  if (denied) return denied;

  const scopeChange = await scopeChangeRepository.findById(scopeChangeId);
  if (!scopeChange || scopeChange.projectId !== projectId) return notFound("Scope change not found.");
  if (scopeChange.status !== "pending") return badRequest("This scope change has already been decided.");

  const updated: ScopeChange = {
    ...scopeChange,
    status: "declined",
    decidedByUserId: session.userId,
    decidedByName: session.name,
    decidedAt: new Date().toISOString(),
  };
  await scopeChangeRepository.update(updated);
  await notifyAgency(projectId, "scope_change_declined", "Scope change declined", `${session.name} declined "${scopeChange.title}".`);
  return ok(updated);
}
