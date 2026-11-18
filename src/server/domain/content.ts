export interface ContentChecklistItem {
  id: string;
  projectId: string;
  label: string;
  required: boolean;
  accepted: boolean;
}

/** Decision: every item flagged required must be accepted — not just some of them. */
export function requiredItemsAllAccepted(items: ContentChecklistItem[]): boolean {
  return items.filter((item) => item.required).every((item) => item.accepted);
}
