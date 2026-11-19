import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getCurrentDesignVersion, getPinCommentsForVersion, getRevisionRounds } from "@/server/services/design-service";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { SubmitRoundPanel } from "./submit-round-panel";

export default async function SubmitRevisionRoundPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/dashboard");

  const current = await getCurrentDesignVersion(projectId);
  if (!current) redirect(`/projects/${projectId}/design`);

  const [pins, rounds] = await Promise.all([getPinCommentsForVersion(current.id, session.userId), getRevisionRounds(projectId)]);
  const draftComments = pins.filter((p) => p.isDraft && p.authorId === session.userId);
  if (draftComments.length === 0) redirect(`/projects/${projectId}/design`);

  return (
    <>
      <TopBar
        breadcrumb={`My projects  /  ${project.clientName}`}
        action={
          <Button variant="secondary" className="w-[180px]">
            Notifications
          </Button>
        }
      />
      <PageHeader
        eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
        title="Send your feedback to the team"
        description={`Your comments will be submitted together as Revision round ${rounds.length + 1}.`}
      />
      <SubmitRoundPanel
        projectId={projectId}
        versionId={current.id}
        versionLabel={`Design · Homepage Version ${current.versionNumber}`}
        nextRoundNumber={rounds.length + 1}
        comments={draftComments.map((c) => ({ id: c.id, number: c.number, title: c.title, body: c.body }))}
      />
    </>
  );
}
