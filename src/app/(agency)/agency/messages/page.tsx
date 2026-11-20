import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { getConversationsForSession } from "@/server/services/message-service";
import { getClientDirectory } from "@/server/services/project-service";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { MessagesInbox } from "@/components/notifications/MessagesInbox";

export default async function AgencyMessagesPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") {
    redirect("/sign-in");
  }

  const conversations = await getConversationsForSession(session);
  // Project.contactName is the agency lead shown to the client ("Your
  // project lead is Jerry Royal") — the real client contact lives in the
  // client directory instead (e.g. "Alex"), which is what the inbox should
  // show as the other side of the conversation.
  const clientDirectory = await getClientDirectory();
  const items = conversations.map((c) => ({
    projectId: c.project.id,
    projectName: c.project.clientName,
    counterpartName: clientDirectory.find((entry) => entry.clientId === c.project.clientId)?.contactName ?? c.project.clientName,
    lastMessageBody: c.lastMessage.body,
    lastMessageAt: c.lastMessage.createdAt,
    unreadCount: c.unreadCount,
  }));

  return (
    <>
      <TopBar breadcrumb="Royal Creative / Messages" action={<NotificationsBell className="w-[200px]" />} />
      <PageHeader eyebrow="AGENCY WORKSPACE" title="Messages" />
      {items.length === 0 ? (
        <p className="text-sm text-ink-secondary">No conversations yet — they&apos;ll appear here once a project chat starts.</p>
      ) : (
        <MessagesInbox conversations={items} viewerUserId={session.userId} readOnly={false} projectHrefPrefix="/agency/projects/" />
      )}
    </>
  );
}
