import {
  briefRepository,
  proposalRepository,
  invoiceRepository,
  contentChecklistRepository,
  designVersionRepository,
  projectRepository,
} from "../repositories/container";
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
    briefApproved: brief?.status === "approved",
    proposalAccepted: proposal?.status === "accepted",
    depositConfirmed: invoice ? isInvoiceConfirmed(invoice) : false,
    requiredContentAccepted: requiredItemsAllAccepted(contentItems),
    designApproved: designVersion?.status === "approved",
    developmentApproved: developmentVersion?.status === "approved",
    launchChecklistComplete: isLaunchChecklistComplete(project.launchChecklist),
  };
}

/** Advances the project's stage if its current gate is now satisfied; otherwise leaves it unchanged. */
export async function tryAdvanceStageIfGated(project: Project): Promise<Project> {
  const gates = await computeGateState(project);
  const result = canAdvance(project.stage, gates);
  if (result.allowed && result.nextStage) {
    const updated: Project = {
      ...project,
      stage: result.nextStage,
      // A00's "Completed this month" metric needs a real completion
      // timestamp — Project has no other record of when a stage was reached.
      ...(result.nextStage === "handover" ? { handoverAt: new Date().toISOString() } : {}),
    };
    await projectRepository.update(updated);
    if (result.nextStage === "launch") await activateScheduledInvoices(project.id);
    return updated;
  }
  return project;
}

/**
 * Flips every "scheduled" invoice on a project (the final payment created by
 * createInvoicesFromPaymentSchedule — see invoice-service.ts) to "unpaid",
 * due now. Lives here rather than in invoice-service.ts because it's a
 * side-effect of the development -> launch transition, and invoice-service
 * already imports tryAdvanceStageIfGated from this module — importing the
 * other way back would be circular.
 */
export async function activateScheduledInvoices(projectId: string): Promise<void> {
  const invoices = await invoiceRepository.listByProjectId(projectId);
  const dueNow = new Date().toISOString().slice(0, 10);
  let activatedAny = false;

  for (const invoice of invoices) {
    if (invoice.status !== "scheduled") continue;
    const updated: Invoice = { ...invoice, status: "unpaid", dueDate: dueNow };
    await invoiceRepository.update(updated);
    activatedAny = true;
  }

  if (activatedAny) {
    await notifyClient(projectId, "final_invoice_due", "Final invoice due", "Your final invoice is now due.");
  }
}
