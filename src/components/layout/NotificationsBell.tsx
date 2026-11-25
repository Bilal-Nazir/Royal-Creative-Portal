import { getSessionFromCookies } from "@/server/auth/cookies";
import { getNotificationsForSession } from "@/server/services/notification-service";
import { NotificationsButton } from "./NotificationsButton";

const PREVIEW_COUNT = 6;

export interface NotificationsBellProps {
  className?: string;
  iconOnly?: boolean;
}

/** Drop-in replacement for the old static "Notifications" TopBar button — fetches real notifications server-side for the dropdown preview. */
export async function NotificationsBell({ className, iconOnly }: NotificationsBellProps) {
  const session = await getSessionFromCookies();
  if (!session) return null;

  const notifications = await getNotificationsForSession(session);
  const unreadCount = notifications.filter((n) => !n.readAt).length;
  const href = session.role === "agency" ? "/agency/notifications" : "/notifications";
  return (
    <NotificationsButton
      href={href}
      unreadCount={unreadCount}
      notifications={notifications.slice(0, PREVIEW_COUNT)}
      className={className}
      iconOnly={iconOnly}
    />
  );
}
