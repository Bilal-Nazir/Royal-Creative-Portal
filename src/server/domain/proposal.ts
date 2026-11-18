export type ProposalStatus = "draft" | "sent" | "changes_requested" | "accepted";

export interface ProposalFields {
  scope: string;
  timeline: string;
  revisions: string;
  exclusions: string;
}

export interface PaymentScheduleItem {
  label: string;
  amount: number;
}

export interface ProposalVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  fields: ProposalFields;
  fee: number;
  paymentSchedule: PaymentScheduleItem[];
  status: ProposalStatus;
  createdByName: string;
  createdAt: string;
  changesRequestedText?: string;
  changesRequestedAttachmentUrl?: string;
  changesRequestedAt?: string;
}

export interface AcceptanceRecord {
  id: string;
  projectId: string;
  proposalVersionId: string;
  proposalVersionNumber: number;
  amount: number;
  userId: string;
  userName: string;
  acceptedAt: string;
}
