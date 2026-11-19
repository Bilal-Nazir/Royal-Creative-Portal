export type ContentItemStatus = "not_started" | "submitted" | "changes_requested" | "accepted";

export interface ContentChecklistItem {
  id: string;
  projectId: string;
  label: string;
  required: boolean;
  status: ContentItemStatus;
}

/** Decision: every item flagged required must be accepted — not just some of them. */
export function requiredItemsAllAccepted(items: ContentChecklistItem[]): boolean {
  return items.filter((item) => item.required).every((item) => item.status === "accepted");
}

/** A11/A09 — one client submission (files, a shared link, notes) against a single checklist item. */
export interface ContentSubmission {
  id: string;
  projectId: string;
  checklistItemId: string;
  fileIds: string[];
  sharedLink?: string;
  notes?: string;
  submittedByName: string;
  submittedAt: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
}
