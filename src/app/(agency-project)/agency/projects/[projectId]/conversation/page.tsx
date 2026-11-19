import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getProjectMessages } from "@/server/services/message-service";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ChatPanel } from "@/components/project/ChatPanel";

/** Agency side of R10's per-project chat — the client-facing screen, mirrored so the agency has somewhere to reply from. */
export default async function AgencyProjectConversationPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/agency/projects");

  const messages = await getProjectMessages(projectId);

  return (
    <>
      <TopBar
        breadcrumb={`Royal Creative / Projects / ${project.name}`}
        action={
          <Button variant="secondary" className="w-[180px]">
            Notifications
          </Button>
        }
      />
      <PageHeader eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`} title="Project conversation" description="Chat with the client without leaving the project." />
      <ChatPanel projectId={projectId} initialMessages={messages} viewerUserId={session.userId} />
    </>
  );
}
