import { briefRepository, proposalRepository, invoiceRepository, contentChecklistRepository, projectRepository } from "../repositories/container";
import { requiredItemsAllAccepted } from "../domain/content";
import { isInvoiceConfirmed } from "../domain/invoice";
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
    return updated;
  }
  return project;
}
