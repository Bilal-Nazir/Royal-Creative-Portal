import { getSessionFromCookies } from "@/server/auth/cookies";
import { countUnreadNotifications } from "@/server/services/notification-service";
import { NotificationsButton } from "./NotificationsButton";

export interface NotificationsBellProps {
  className?: string;
}

/** Drop-in replacement for the old static "Notifications" TopBar button — fetches the real unread count server-side. */
export async function NotificationsBell({ className }: NotificationsBellProps) {
  const session = await getSessionFromCookies();
  if (!session) return null;

  const unreadCount = await countUnreadNotifications(session);
  const href = session.role === "agency" ? "/agency/notifications" : "/notifications";
  return <NotificationsButton href={href} unreadCount={unreadCount} className={className} />;
}
