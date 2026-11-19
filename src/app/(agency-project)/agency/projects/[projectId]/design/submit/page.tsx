import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getCurrentDesignVersion, getRevisionRounds } from "@/server/services/design-service";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { VersionSubmitForm } from "@/components/project/VersionSubmitForm";

export default async function SubmitDesignPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/agency/projects");

  const [currentVersion, rounds] = await Promise.all([getCurrentDesignVersion(projectId), getRevisionRounds(projectId)]);
  const isRevision = currentVersion !== null;
  const respondingToRound = rounds.find((r) => r.designVersionId === currentVersion?.id);

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
      <PageHeader
        eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
        title={isRevision ? "Share the revised design" : "Share a design"}
        description={respondingToRound ? `This submission is linked to Design revision round ${respondingToRound.roundNumber}.` : undefined}
      />
      <Card className="flex flex-col gap-4 p-6">
        <VersionSubmitForm
          projectId={projectId}
          apiBasePath={`/api/projects/${projectId}/design`}
          redirectPath={`/agency/projects/${projectId}/design`}
          respondsToRoundId={respondingToRound?.id}
          isRevision={isRevision}
          linkLabel="Figma link"
          linkPlaceholder="https://figma.com/design/…"
          screenshotLabel="Review screenshots"
          screenshotPlaceholder="Upload the desktop and mobile frames to review"
          revisedScreenshotLabel="Updated review screenshots"
          revisedScreenshotPlaceholder="Upload the revised desktop and mobile frames"
          whatChangedLabel="What changed"
          whatChangedPlaceholder="Reduced the hero heading and replaced the company description."
          submitLabel="Share with client"
          resubmitLabel="Submit revised design"
        />
      </Card>
    </>
  );
}
