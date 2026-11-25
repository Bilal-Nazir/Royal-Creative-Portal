import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { getConversationsForSession } from "@/server/services/message-service";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { MessagesInbox } from "@/components/notifications/MessagesInbox";

/** No Figma frame for the client Messages nav page — built from the existing conversation service and ChatPanel (see DESIGN_NOTES). */
export default async function MessagesPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") {
    redirect("/sign-in");
  }

  const conversations = await getConversationsForSession(session);
  const items = conversations.map((c) => ({
    projectId: c.project.id,
    projectName: c.project.name,
    counterpartName: c.project.assigneeName,
    lastMessageBody: c.lastMessage.body,
    lastMessageAt: c.lastMessage.createdAt,
    unreadCount: c.unreadCount,
  }));

  return (
    <>
      <TopBar breadcrumb="Messages" action={<NotificationsBell iconOnly />} />
      <PageHeader eyebrow="CLIENT PORTAL" title="Messages" description="Your project conversations with Royal Creative." />
      {items.length === 0 ? (
        <p className="text-sm text-ink-secondary">No conversations yet — they&apos;ll appear here once your project team messages you.</p>
      ) : (
        <MessagesInbox
          conversations={items}
          viewerUserId={session.userId}
          readOnly={session.clientRole === "viewer"}
          projectHrefPrefix="/projects/"
          projectHrefSuffix="/brief"
        />
      )}
    </>
  );
}
