import { notificationRepository } from "../repositories/container";
import type { Notification, NotificationType } from "../domain/notification";

/**
 * Records key events (content submitted, design shared, revision round
 * submitted, design approved, work assigned) for both sides of a project.
 * No UI reads these yet — that's a later phase — but the records exist now
 * so that UI can be built without touching the services that create them.
 */
async function createNotification(
  projectId: string,
  type: NotificationType,
  recipientRole: "client" | "agency",
  title: string,
  body: string,
  recipientUserId?: string,
): Promise<void> {
  const notification: Notification = {
    id: `notification-${projectId}-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId,
    type,
    recipientRole,
    recipientUserId,
    title,
    body,
    createdAt: new Date().toISOString(),
  };
  await notificationRepository.create(notification);
}

export async function notifyAgency(projectId: string, type: NotificationType, title: string, body: string): Promise<void> {
  await createNotification(projectId, type, "agency", title, body);
}

export async function notifyClient(projectId: string, type: NotificationType, title: string, body: string): Promise<void> {
  await createNotification(projectId, type, "client", title, body);
}

/** R04 (and R18 later) — assigning work notifies that specific agency user, not just "agency" broadly. */
export async function notifyAssignee(projectId: string, assigneeId: string, title: string, body: string): Promise<void> {
  await createNotification(projectId, "revision_round_assigned", "agency", title, body, assigneeId);
}
