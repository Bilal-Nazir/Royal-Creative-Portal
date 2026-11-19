export type NotificationType =
  | "content_submitted"
  | "design_shared"
  | "revision_round_submitted"
  | "design_approved"
  | "revision_round_assigned"
  | "development_shared"
  | "development_round_submitted"
  | "build_approved"
  | "final_invoice_due"
  | "launch_scheduled"
  | "website_live"
  | "scope_change_sent"
  | "scope_change_accepted"
  | "scope_change_declined";

/**
 * Recorded by services on key events (see notification-service.ts). No UI
 * reads these yet — that's a later phase — but the records exist so it can
 * be built without touching the services that create them.
 *
 * `recipientRole` is the broad audience ("agency" / "client"); when a
 * notification is for one specific person (e.g. being assigned a revision
 * round), `recipientUserId` narrows it to just them.
 */
export interface Notification {
  id: string;
  projectId: string;
  type: NotificationType;
  recipientRole: "client" | "agency";
  recipientUserId?: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
}
