import { projectRepository, briefRepository, proposalRepository, invoiceRepository } from "../repositories/container";
import type { Stage } from "../domain/stage";
import type { BriefStatus } from "../domain/brief";
import type { ProposalStatus } from "../domain/proposal";
import type { InvoiceStatus } from "../domain/invoice";

export interface DemoStatePatch {
  projectId: string;
  stage?: Stage;
  briefStatus?: BriefStatus;
  proposalStatus?: ProposalStatus;
  invoiceStatus?: InvoiceStatus;
}

/**
 * Dev-only convenience for reaching every screen state without replaying the
 * full flow. Bypasses the normal permission/gate services on purpose — it's
 * a test fixture control, not a user-facing action — which is why the route
 * handler on top of this additionally checks NODE_ENV === "development".
 */
export async function setDemoState(patch: DemoStatePatch): Promise<void> {
  const project = await projectRepository.findById(patch.projectId);
  if (!project) throw new Error("Project not found.");

  if (patch.stage) {
    await projectRepository.update({ ...project, stage: patch.stage });
  }
  if (patch.briefStatus) {
    const brief = await briefRepository.getCurrentVersion(patch.projectId);
    if (brief) await briefRepository.update({ ...brief, status: patch.briefStatus });
  }
  if (patch.proposalStatus) {
    const proposal = await proposalRepository.getCurrentVersion(patch.projectId);
    if (proposal) await proposalRepository.update({ ...proposal, status: patch.proposalStatus });
  }
  if (patch.invoiceStatus) {
    const invoice = await invoiceRepository.getDepositInvoice(patch.projectId);
    // Setting a status via the switcher means "put the invoice cleanly into
    // this state" — a stale failure/promise/verification left over from a
    // previous state shouldn't leak into it.
    if (invoice) {
      await invoiceRepository.update({
        ...invoice,
        status: patch.invoiceStatus,
        lastFailureReason: undefined,
        promisedDate: undefined,
        paidAt: patch.invoiceStatus === "paid" ? (invoice.paidAt ?? new Date().toISOString()) : undefined,
      });
    }
  }
}
