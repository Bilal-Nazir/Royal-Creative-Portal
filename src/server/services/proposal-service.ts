import { proposalRepository, acceptanceRecordRepository, projectRepository } from "../repositories/container";
import { assertClientCanActOnProject, assertAgencyCanManageProject } from "./permissions";
import { ok, notFound, type ServiceResult } from "./result";
import { tryAdvanceStageIfGated } from "./stage-service";
import { createInvoicesFromPaymentSchedule } from "./invoice-service";
import type { SessionPayload } from "../auth/session";
import type { ProposalVersion, AcceptanceRecord, ProposalFields, PaymentScheduleItem } from "../domain/proposal";

export async function getProposalForProject(projectId: string): Promise<ProposalVersion | null> {
  return proposalRepository.getCurrentVersion(projectId);
}

export async function listProposalVersions(projectId: string): Promise<ProposalVersion[]> {
  return proposalRepository.listVersions(projectId);
}

export async function getAcceptanceRecords(projectId: string): Promise<AcceptanceRecord[]> {
  return acceptanceRecordRepository.listByProjectId(projectId);
}

export async function requestProposalChanges(
  session: SessionPayload,
  projectId: string,
  text: string,
  attachmentUrl?: string,
): Promise<ServiceResult<ProposalVersion>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertClientCanActOnProject<ProposalVersion>(session, project);
  if (denied) return denied;

  const proposal = await proposalRepository.getCurrentVersion(projectId);
  if (!proposal) return notFound("Proposal not found.");

  const updated: ProposalVersion = {
    ...proposal,
    status: "changes_requested",
    changesRequestedText: text,
    changesRequestedAttachmentUrl: attachmentUrl,
    changesRequestedAt: new Date().toISOString(),
  };
  await proposalRepository.update(updated);
  return ok(updated);
}

/** Agency-only: responds to a changes_requested proposal with a new, sent version. */
export async function sendRevisedProposal(
  session: SessionPayload,
  projectId: string,
  fields: ProposalFields,
  fee: number,
  paymentSchedule: PaymentScheduleItem[],
  includedRevisionRounds?: number,
): Promise<ServiceResult<ProposalVersion>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<ProposalVersion>(session, project);
  if (denied) return denied;

  const current = await proposalRepository.getCurrentVersion(projectId);
  if (!current) return notFound("Proposal not found.");

  const revised: ProposalVersion = {
    id: `proposal-${projectId}-v${current.versionNumber + 1}`,
    projectId,
    versionNumber: current.versionNumber + 1,
    fields,
    fee,
    paymentSchedule,
    includedRevisionRounds: includedRevisionRounds ?? current.includedRevisionRounds,
    status: "sent",
    createdByName: session.name,
    createdAt: new Date().toISOString(),
  };
  await proposalRepository.create(revised);
  return ok(revised);
}

/**
 * A06's "Save proposal draft" / "Send proposal" actions. Draft-aware like
 * saveBriefDraft/sendBriefForReview — see brief-service.ts for why this is
 * separate from sendRevisedProposal.
 */
export async function saveProposalDraft(
  session: SessionPayload,
  projectId: string,
  fields: ProposalFields,
  fee: number,
  paymentSchedule: PaymentScheduleItem[],
  includedRevisionRounds: number,
): Promise<ServiceResult<ProposalVersion>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<ProposalVersion>(session, project);
  if (denied) return denied;

  const current = await proposalRepository.getCurrentVersion(projectId);
  if (current && current.status === "draft") {
    const updated: ProposalVersion = { ...current, fields, fee, paymentSchedule, includedRevisionRounds };
    await proposalRepository.update(updated);
    return ok(updated);
  }

  const draft: ProposalVersion = {
    id: `proposal-${projectId}-v${(current?.versionNumber ?? 0) + 1}`,
    projectId,
    versionNumber: (current?.versionNumber ?? 0) + 1,
    fields,
    fee,
    paymentSchedule,
    includedRevisionRounds,
    status: "draft",
    createdByName: session.name,
    createdAt: new Date().toISOString(),
  };
  await proposalRepository.create(draft);
  return ok(draft);
}

export async function sendProposalForReview(
  session: SessionPayload,
  projectId: string,
  fields: ProposalFields,
  fee: number,
  paymentSchedule: PaymentScheduleItem[],
  includedRevisionRounds: number,
): Promise<ServiceResult<ProposalVersion>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertAgencyCanManageProject<ProposalVersion>(session, project);
  if (denied) return denied;

  const current = await proposalRepository.getCurrentVersion(projectId);
  if (current && current.status === "draft") {
    const updated: ProposalVersion = { ...current, fields, fee, paymentSchedule, includedRevisionRounds, status: "sent" };
    await proposalRepository.update(updated);
    return ok(updated);
  }

  const sent: ProposalVersion = {
    id: `proposal-${projectId}-v${(current?.versionNumber ?? 0) + 1}`,
    projectId,
    versionNumber: (current?.versionNumber ?? 0) + 1,
    fields,
    fee,
    paymentSchedule,
    includedRevisionRounds,
    status: "sent",
    createdByName: session.name,
    createdAt: new Date().toISOString(),
  };
  await proposalRepository.create(sent);
  return ok(sent);
}

/** Called from R14 (the confirmation step) — accepting a proposal records who, when, which version, and how much. */
export async function acceptProposal(
  session: SessionPayload,
  projectId: string,
): Promise<ServiceResult<AcceptanceRecord>> {
  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");
  const denied = assertClientCanActOnProject<AcceptanceRecord>(session, project);
  if (denied) return denied;

  const proposal = await proposalRepository.getCurrentVersion(projectId);
  if (!proposal) return notFound("Proposal not found.");

  const updatedProposal: ProposalVersion = { ...proposal, status: "accepted" };
  await proposalRepository.update(updatedProposal);

  const record: AcceptanceRecord = {
    id: `accept-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId,
    proposalVersionId: proposal.id,
    proposalVersionNumber: proposal.versionNumber,
    amount: proposal.fee,
    userId: session.userId,
    userName: session.name,
    acceptedAt: new Date().toISOString(),
  };
  await acceptanceRecordRepository.create(record);
  // Without this, a brand-new project (A04) that goes brief -> proposal ->
  // accept has no invoices for the deposit/launch stages to gate on or for
  // the client to pay. createInvoicesFromPaymentSchedule is idempotent, so
  // re-accepting (e.g. a re-sent proposal getting accepted again) never
  // creates duplicates.
  await createInvoicesFromPaymentSchedule(projectId, proposal.paymentSchedule.length > 0 ? proposal.paymentSchedule : [{ label: "Deposit", amount: proposal.fee }]);
  await tryAdvanceStageIfGated(project);
  return ok(record);
}
