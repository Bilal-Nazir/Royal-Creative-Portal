import { briefRepository, proposalRepository, invoiceRepository, contentChecklistRepository, projectRepository } from "../repositories/container";
import { requiredItemsAllAccepted } from "../domain/content";
import { isInvoiceConfirmed, type Invoice } from "../domain/invoice";
import { isLaunchChecklistComplete, type Project } from "../domain/project";
import { canAdvance, type ProjectGateState } from "../domain/stage";

/**
 * Computes the live gate state for a project from its brief/proposal/invoice/
 * content records. designApproved and developmentApproved are always false —
 * Phase 2a doesn't build the design/development approval screens (R06/R07/R19
 * etc.) or their underlying records yet, so those two gates have nothing real
 * to read from. launchChecklistComplete is real (Project.launchChecklist
 * exists) even though no Phase 2a screen sets it, so the demo switcher and
 * tests can exercise it.
 */
export async function computeGateState(project: Project): Promise<ProjectGateState> {
  const [brief, proposal, invoice, contentItems] = await Promise.all([
    briefRepository.getCurrentVersion(project.id),
    proposalRepository.getCurrentVersion(project.id),
    invoiceRepository.getDepositInvoice(project.id),
    contentChecklistRepository.listByProjectId(project.id),
  ]);

  return {
    briefApproved: brief?.status === "approved",
    proposalAccepted: proposal?.status === "accepted",
    depositConfirmed: invoice ? isInvoiceConfirmed(invoice) : false,
    requiredContentAccepted: requiredItemsAllAccepted(contentItems),
    designApproved: false,
    developmentApproved: false,
    launchChecklistComplete: isLaunchChecklistComplete(project.launchChecklist),
  };
}

/** Advances the project's stage if its current gate is now satisfied; otherwise leaves it unchanged. */
export async function tryAdvanceStageIfGated(project: Project): Promise<Project> {
  const gates = await computeGateState(project);
  const result = canAdvance(project.stage, gates);
  if (result.allowed && result.nextStage) {
    const updated: Project = { ...project, stage: result.nextStage };
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

  for (const invoice of invoices) {
    if (invoice.status !== "scheduled") continue;
    const updated: Invoice = { ...invoice, status: "unpaid", dueDate: dueNow };
    await invoiceRepository.update(updated);
  }
}
