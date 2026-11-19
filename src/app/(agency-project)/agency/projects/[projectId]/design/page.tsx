import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getCurrentDesignVersion, getRevisionRounds } from "@/server/services/design-service";
import { formatDate } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ListRow } from "@/components/ui/ListRow";

export default async function AgencyDesignHubPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/agency/projects");

  const [currentVersion, rounds] = await Promise.all([getCurrentDesignVersion(projectId), getRevisionRounds(projectId)]);

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
        title="Design"
        description={currentVersion ? `Homepage · Version ${currentVersion.versionNumber}` : "Nothing shared with the client yet."}
        action={
          <Button href={`/agency/projects/${projectId}/design/submit`} variant="primary" className="w-[220px]">
            {currentVersion ? "Submit revised design" : "Share a design"}
          </Button>
        }
      />

      {currentVersion ? (
        <Card className="flex flex-col gap-2 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold text-ink">Current version</h2>
            <Badge tone={currentVersion.status === "approved" ? "success" : "neutral"}>{currentVersion.status}</Badge>
          </div>
          <p className="text-sm text-ink-secondary">
            Shared by {currentVersion.createdByName} on {formatDate(currentVersion.createdAt)}
          </p>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-3 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Revision rounds</h2>
        {rounds.map((round) => (
          <ListRow
            key={round.id}
            href={`/agency/projects/${projectId}/design/rounds/${round.id}`}
            title={`Round ${round.roundNumber}`}
            subtitle={`${round.commentIds.length} comments · Submitted by ${round.submittedByName} on ${formatDate(round.submittedAt)}`}
            trailing={<Badge tone={round.overAllowance ? "warning" : "neutral"}>{round.workflowStatus.replace("_", " ")}</Badge>}
          />
        ))}
        {rounds.length === 0 ? <p className="text-sm text-ink-secondary">No revision rounds submitted yet.</p> : null}
      </Card>
    </>
  );
}
