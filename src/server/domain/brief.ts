export type BriefStatus = "draft" | "sent" | "changes_requested" | "approved" | "skipped";

export interface BriefFields {
  objective: string;
  audience: string;
  pages: string;
  features: string;
  deliverables: string;
}

export interface BriefVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  fields: BriefFields;
  status: BriefStatus;
  createdByName: string;
  createdAt: string;
  /** Set when status moves to "approved". */
  approvedByUserId?: string;
  approvedByName?: string;
  approvedAt?: string;
  /** Set when status moves to "changes_requested". The version itself is kept, not bumped. */
  revisionRequestedText?: string;
  revisionRequestedAttachmentUrl?: string;
  revisionRequestedAt?: string;
  /** Set when status moves to "skipped" (A04 "Start from: Proposal", or A16's "Skip brief"). */
  skippedByUserId?: string;
  skippedByName?: string;
  skippedAt?: string;
}
