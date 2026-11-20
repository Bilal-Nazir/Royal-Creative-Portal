import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getCurrentDesignVersion, getRevisionRounds } from "@/server/services/design-service";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { VersionSubmitForm } from "@/components/project/VersionSubmitForm";

/** A11 · Submit development — staging link, required review screenshots, message to client. */
export default async function SubmitDevelopmentPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/agency/projects");

  const [currentVersion, rounds] = await Promise.all([
    getCurrentDesignVersion(projectId, "development"),
    getRevisionRounds(projectId, "development"),
  ]);
  const isRevision = currentVersion !== null;
  const respondingToRound = rounds.find((r) => r.designVersionId === currentVersion?.id);

  return (
    <>
      <TopBar
        breadcrumb={`Royal Creative / Projects / ${project.name}`}
        action={
          <NotificationsBell className="w-[180px]" />
        }
      />
      <PageHeader
        eyebrow={`${project.clientName.toUpperCase()} · RC-1024`}
        title={isRevision ? "Share the revised build" : "Share the staging site"}
        description={respondingToRound ? `This submission is linked to Development revision round ${respondingToRound.roundNumber}.` : undefined}
      />
      <Card className="flex flex-col gap-4 p-6">
        <VersionSubmitForm
          projectId={projectId}
          apiBasePath={`/api/projects/${projectId}/development`}
          redirectPath={`/agency/projects/${projectId}/development`}
          respondsToRoundId={respondingToRound?.id}
          isRevision={isRevision}
          linkLabel="Staging link"
          linkPlaceholder="https://royal-trendsy-preview.example"
          screenshotLabel="Review screenshots"
          screenshotPlaceholder="Upload the desktop and mobile build screenshots to review"
          revisedScreenshotLabel="Updated review screenshots"
          revisedScreenshotPlaceholder="Upload the revised build screenshots"
          whatChangedLabel="Changes completed"
          whatChangedPlaceholder="Contact form validation and mobile navigation have been updated."
          submitLabel="Share with client"
          resubmitLabel="Submit revised development"
        />
      </Card>
    </>
  );
}
