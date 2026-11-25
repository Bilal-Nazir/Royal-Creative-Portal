import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { getNotificationsForSession } from "@/server/services/notification-service";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { NotificationsView } from "@/components/notifications/NotificationsView";

export default async function ClientNotificationsPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") {
    redirect("/sign-in");
  }

  const notifications = await getNotificationsForSession(session);
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <>
      <TopBar breadcrumb="Notifications" action={<NotificationsBell iconOnly />} />
      <PageHeader
        eyebrow="CLIENT PORTAL"
        title="Notifications"
        description={`${notifications.length} updates on your projects · ${unreadCount} unread.`}
      />
      <NotificationsView initialNotifications={notifications} />
    </>
  );
}
