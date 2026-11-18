import { proposalRepository, acceptanceRecordRepository, projectRepository } from "../repositories/container";
import { assertClientCanActOnProject, assertAgencyCanManageProject } from "./permissions";
import { ok, notFound, type ServiceResult } from "./result";
import { tryAdvanceStageIfGated } from "./stage-service";
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
    status: "sent",
    createdByName: session.name,
    createdAt: new Date().toISOString(),
  };
  await proposalRepository.create(revised);
  return ok(revised);
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
  await tryAdvanceStageIfGated(project);
  return ok(record);
}
