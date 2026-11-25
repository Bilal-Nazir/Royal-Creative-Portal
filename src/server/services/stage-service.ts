import {
  briefRepository,
  proposalRepository,
  invoiceRepository,
  contentChecklistRepository,
  designVersionRepository,
  projectRepository,
} from "../repositories/container";
import { withTransaction } from "../db/transaction";
import type { Tx } from "../repositories/interfaces";
import { requiredItemsAllAccepted } from "../domain/content";
import { isInvoiceConfirmed, type Invoice } from "../domain/invoice";
import { isLaunchChecklistComplete, type Project } from "../domain/project";
import { canAdvance, type ProjectGateState } from "../domain/stage";
import { notifyClient } from "./notification-service";

/** Computes the live gate state for a project from its brief/proposal/invoice/content/design/development records. */
export async function computeGateState(project: Project): Promise<ProjectGateState> {
  const [brief, proposal, invoice, contentItems, designVersion, developmentVersion] = await Promise.all([
    briefRepository.getCurrentVersion(project.id),
    proposalRepository.getCurrentVersion(project.id),
    invoiceRepository.getDepositInvoice(project.id),
    contentChecklistRepository.listByProjectId(project.id),
    designVersionRepository.getCurrentVersion(project.id, "design"),
    designVersionRepository.getCurrentVersion(project.id, "development"),
  ]);

  return {
    // Decision: a skipped brief (A04 "Start from: Proposal", or A16's "Skip
    // brief") satisfies this gate exactly like an approved one — there's
    // nothing left to review.
    briefApproved: brief?.status === "approved" || brief?.status === "skipped",
    proposalAccepted: proposal?.status === "accepted",
    depositConfirmed: invoice ? isInvoiceConfirmed(invoice) : false,
    requiredContentAccepted: requiredItemsAllAccepted(contentItems),
    designApproved: designVersion?.status === "approved",
    developmentApproved: developmentVersion?.status === "approved",
    launchChecklistComplete: isLaunchChecklistComplete(project.launchChecklist),
  };
}

/**
 * Advances the project's stage if its current gate is now satisfied;
 * otherwise leaves it unchanged. This is a multi-document write (the
 * project, and — on the development -> launch transition — every scheduled
 * invoice plus a notification), so it runs inside a Mongo transaction.
 * When `session` is omitted entirely, this call owns and starts its own
 * transaction; when a caller (e.g. acceptProposal) already has one open and
 * passes it through, this just joins it instead of nesting a second one.
 */
export async function tryAdvanceStageIfGated(project: Project, session?: Tx): Promise<Project> {
  const gates = await computeGateState(project);
  const result = canAdvance(project.stage, gates);
  if (!result.allowed || !result.nextStage) return project;
  const nextStage = result.nextStage;

  const advance = async (txSession: Tx): Promise<Project> => {
    const updated: Project = {
      ...project,
      stage: nextStage,
      // A00's "Completed this month" metric needs a real completion
      // timestamp — Project has no other record of when a stage was reached.
      ...(nextStage === "handover" ? { handoverAt: new Date().toISOString() } : {}),
    };
    await projectRepository.update(updated, txSession);
    if (nextStage === "launch") await activateScheduledInvoices(project.id, txSession);
    return updated;
  };

  if (session !== undefined) return advance(session);
  return withTransaction(advance);
}

/**
 * Flips every "scheduled" invoice on a project (the final payment created by
 * createInvoicesFromPaymentSchedule — see invoice-service.ts) to "unpaid",
 * due now. Lives here rather than in invoice-service.ts because it's a
 * side-effect of the development -> launch transition, and invoice-service
 * already imports tryAdvanceStageIfGated from this module — importing the
 * other way back would be circular.
 */
export async function activateScheduledInvoices(projectId: string, session?: Tx): Promise<void> {
  const invoices = await invoiceRepository.listByProjectId(projectId);
  const dueNow = new Date().toISOString().slice(0, 10);
  let activatedAny = false;

  for (const invoice of invoices) {
    if (invoice.status !== "scheduled") continue;
    const updated: Invoice = { ...invoice, status: "unpaid", dueDate: dueNow };
    await invoiceRepository.update(updated, session);
    activatedAny = true;
  }

  if (activatedAny) {
    await notifyClient(projectId, "final_invoice_due", "Final invoice due", "Your final invoice is now due.", session);
  }
}
