import { notificationRepository, projectRepository } from "../repositories/container";
import type { SessionPayload } from "../auth/session";
import { forbidden, notFound, ok, type ServiceResult } from "./result";
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

/** A14 — which stage sub-page a notification's "related work" link should land on, per role. Falls back to the project landing page. */
const AGENCY_TYPE_PATH: Partial<Record<NotificationType, string>> = {
  content_submitted: "content",
  design_shared: "design",
  revision_round_submitted: "design",
  revision_round_assigned: "design",
  design_approved: "design",
  development_shared: "development",
  development_round_submitted: "development",
  build_approved: "development",
  launch_scheduled: "launch",
  website_live: "launch",
};
const CLIENT_TYPE_PATH: Partial<Record<NotificationType, string>> = {
  ...AGENCY_TYPE_PATH,
  final_invoice_due: "final-payment",
  scope_change_sent: "scope-changes",
  scope_change_accepted: "scope-changes",
  scope_change_declined: "scope-changes",
};

export interface NotificationWithLink extends Notification {
  href: string;
}

function linkFor(session: SessionPayload, notification: Notification): string {
  if (session.role === "agency") {
    const suffix = AGENCY_TYPE_PATH[notification.type];
    return suffix ? `/agency/projects/${notification.projectId}/${suffix}` : `/agency/projects/${notification.projectId}`;
  }
  const suffix = CLIENT_TYPE_PATH[notification.type];
  return suffix ? `/projects/${notification.projectId}/${suffix}` : `/projects/${notification.projectId}/brief`;
}

/**
 * Scoping: agency owners/admins see every agency-facing notification;
 * members only see broadcast ones (no recipientUserId) plus ones aimed at
 * them specifically. Clients only ever see client-facing notifications tied
 * to a project they own.
 */
async function filterNotificationsForSession(session: SessionPayload, all: Notification[]): Promise<Notification[]> {
  if (session.role === "agency") {
    return all.filter((n) => {
      if (n.recipientRole !== "agency") return false;
      if (!n.recipientUserId) return true;
      if (session.agencyRole === "owner" || session.agencyRole === "admin") return true;
      return n.recipientUserId === session.userId;
    });
  }

  const clientNotifications = all.filter((n) => n.recipientRole === "client");
  if (clientNotifications.length === 0) return [];
  const projects = await projectRepository.listAll();
  const ownProjectIds = new Set(projects.filter((p) => p.clientId === session.clientId).map((p) => p.id));
  return clientNotifications.filter((n) => ownProjectIds.has(n.projectId));
}

/** A14 — every notification this session can see, newest first, each with a link into the related work. */
export async function getNotificationsForSession(session: SessionPayload): Promise<NotificationWithLink[]> {
  const all = await notificationRepository.listAll();
  const scoped = await filterNotificationsForSession(session, all);
  return scoped
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((n) => ({ ...n, href: linkFor(session, n) }));
}

/** TopBar's notification bell badge. */
export async function countUnreadNotifications(session: SessionPayload): Promise<number> {
  const notifications = await getNotificationsForSession(session);
  return notifications.filter((n) => !n.readAt).length;
}

export async function markNotificationRead(session: SessionPayload, id: string): Promise<ServiceResult<Notification>> {
  const notification = await notificationRepository.findById(id);
  if (!notification) return notFound("Notification not found.");
  const [scoped] = await filterNotificationsForSession(session, [notification]);
  if (!scoped) return forbidden("You don't have access to this notification.");
  if (notification.readAt) return ok(notification);

  const updated: Notification = { ...notification, readAt: new Date().toISOString() };
  await notificationRepository.update(updated);
  return ok(updated);
}

export async function markAllNotificationsRead(session: SessionPayload): Promise<ServiceResult<number>> {
  const scoped = await filterNotificationsForSession(session, await notificationRepository.listAll());
  const unread = scoped.filter((n) => !n.readAt);
  const now = new Date().toISOString();
  for (const n of unread) {
    await notificationRepository.update({ ...n, readAt: now });
  }
  return ok(unread.length);
}
