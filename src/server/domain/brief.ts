export type BriefStatus = "draft" | "sent" | "changes_requested" | "approved";

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
}
