import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getProjectMessages } from "@/server/services/message-service";
import { canAct } from "@/server/services/permissions";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChatPanel } from "@/components/project/ChatPanel";

export default async function ProjectConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ draft?: string }>;
}) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") redirect("/sign-in");

  const { projectId } = await params;
  const { draft } = await searchParams;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/dashboard");

  const messages = await getProjectMessages(projectId);

  return (
    <>
      <TopBar
        breadcrumb={`My projects  /  ${project.clientName}`}
        action={
          <NotificationsBell className="w-[180px]" />
        }
      />
      <PageHeader
        eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
        title="Keep the conversation with the work"
        description="Project messages and direct contact stay accessible during reviews."
      />
      <ChatPanel projectId={projectId} initialMessages={messages} viewerUserId={session.userId} readOnly={!canAct(session)} initialDraft={draft} />
    </>
  );
}
