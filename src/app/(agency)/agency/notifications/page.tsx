import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { getNotificationsForSession } from "@/server/services/notification-service";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { NotificationsView } from "@/components/notifications/NotificationsView";

export default async function AgencyNotificationsPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") {
    redirect("/sign-in");
  }

  const notifications = await getNotificationsForSession(session);
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <>
      <TopBar breadcrumb="Royal Creative / Notifications" action={<NotificationsBell className="w-[200px]" />} />
      <PageHeader
        eyebrow="AGENCY WORKSPACE"
        title="Notifications"
        description={`${notifications.length} updates across your agency · ${unreadCount} unread · Each update links to the related work.`}
      />
      <NotificationsView initialNotifications={notifications} />
    </>
  );
}
