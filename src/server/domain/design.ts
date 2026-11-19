/**
 * "superseded" — a later version exists for the project (set when that
 * later version is created, not a flag the client sets). A version in
 * active review, whether or not a revision round has been submitted
 * against it, stays "shared" until either superseded or approved.
 */
export type DesignVersionStatus = "shared" | "superseded" | "approved";

/**
 * Phase 2c — distinguishes the Design review loop (A10/R05/C12/R01) from the
 * Development review loop (A11/C13/R08/R18/R19), which reuses the same
 * version/pin/revision-round machinery under a separate track so a
 * development round never counts against the proposal's design revision
 * allowance and development approval drives Launch instead of Development.
 */
export type ReviewKind = "design" | "development";

/** A10/R05 (design) and A11/C13 (development) — a link + required review screenshots the agency shares for client review. */
export interface DesignVersion {
  id: string;
  projectId: string;
  kind: ReviewKind;
  versionNumber: number;
  figmaLink: string;
  screenshotFileIds: string[];
  message?: string;
  /** R05/R19 — "what changed" / "changes completed" note, set on version 2+ when responding to a revision round. */
  whatChanged?: string;
  /** The round this version was submitted in response to, if any (version 1 has none). */
  respondsToRoundId?: string;
  createdByName: string;
  createdAt: string;
  status: DesignVersionStatus;
  approvedByUserId?: string;
  approvedByName?: string;
  approvedAt?: string;
}

export type PinCommentStatus = "open" | "in_progress" | "resolved";

/**
 * C12/R01 — a numbered pin dropped on a design screenshot. Position is stored
 * as a percentage (x, y) of the screenshot's rendered size, not pixels, so it
 * lines up at any viewport width. `isDraft` until the client submits a
 * revision round, at which point every draft pin on that version is attached
 * to the round together (see RevisionRound.commentIds) and `isDraft` flips to
 * false — drafts are private to the author until then.
 */
export const PIN_TITLE_MAX_LENGTH = 60;

export interface DesignPinComment {
  id: string;
  projectId: string;
  designVersionId: string;
  number: number;
  xPercent: number;
  yPercent: number;
  /** Optional short label (e.g. "Hero heading"), max PIN_TITLE_MAX_LENGTH chars — shown as "{n} · {title}", or "Pin {n}" when absent. */
  title?: string;
  body: string;
  isDraft: boolean;
  authorId: string;
  authorName: string;
  createdAt: string;
  status: PinCommentStatus;
}

/** "{n} · {title}" when a pin has a title, "Pin {n}" otherwise — the one place this label is formatted. */
export function pinLabel(pin: { number: number; title?: string }): string {
  return pin.title ? `${pin.number} · ${pin.title}` : `Pin ${pin.number}`;
}

export type RevisionRoundWorkflowStatus = "submitted" | "in_progress" | "completed";

/** R02/R13/R04 (design) and R08/R18/R19 (development) — every draft pin comment on a version, submitted together as one round. */
export interface RevisionRound {
  id: string;
  projectId: string;
  kind: ReviewKind;
  designVersionId: string;
  roundNumber: number;
  commentIds: string[];
  submittedByName: string;
  submittedAt: string;
  workflowStatus: RevisionRoundWorkflowStatus;
  assigneeId?: string;
  assigneeName?: string;
  targetDate?: string;
  /** True if roundNumber exceeds the proposal's includedRevisionRounds — computed once at submit time. */
  overAllowance: boolean;
  scopeFlaggedAt?: string;
}

/** R04's scope review — flags, doesn't block, a round that exceeds the proposal's included revision rounds. */
export function isOverRevisionAllowance(roundNumber: number, includedRevisionRounds: number): boolean {
  return roundNumber > includedRevisionRounds;
}
