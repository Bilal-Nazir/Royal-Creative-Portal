export type ScopeChangeStatus = "pending" | "accepted" | "declined";

/**
 * R09 (client review) — created by the agency from R04/R18's "Flag for scope
 * decision" or from project detail (A16). Accepting or declining never blocks
 * the project's current stage; existing work continues either way.
 */
export interface ScopeChange {
  id: string;
  projectId: string;
  title: string;
  description: string;
  additionalFee: number;
  timelineImpact: string;
  status: ScopeChangeStatus;
  /** The revision round this was flagged from, if created that way rather than from A16. */
  flaggedFromRoundId?: string;
  createdByName: string;
  createdAt: string;
  decidedByUserId?: string;
  decidedByName?: string;
  decidedAt?: string;
  /** Set only when accepted — the "additional work" invoice created for additionalFee. */
  additionalInvoiceId?: string;
}
