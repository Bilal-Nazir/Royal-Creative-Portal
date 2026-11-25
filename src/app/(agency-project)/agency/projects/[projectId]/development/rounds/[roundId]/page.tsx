import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getRevisionRounds, getPinCommentsForVersion } from "@/server/services/design-service";
import { pinLabel } from "@/server/domain/design";
import { getAssignableAgencyUsers } from "@/server/services/project-service";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RevisionTrackingForm } from "@/components/project/RevisionTrackingForm";
import { PinStatusSelect } from "@/components/project/PinStatusSelect";
import { CreateScopeChangeForm } from "@/components/project/CreateScopeChangeForm";

/** R18 · Development revision work — per-item tasks, developer, target date, workflow status. */
export default async function DevelopmentRevisionRoundDetailPage({ params }: { params: Promise<{ projectId: string; roundId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") redirect("/sign-in");

  const { projectId, roundId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/agency/projects");

  const rounds = await getRevisionRounds(projectId, "development");
  const round = rounds.find((r) => r.id === roundId);
  if (!round) redirect(`/agency/projects/${projectId}/development`);

  const allComments = await getPinCommentsForVersion(round.designVersionId, session.userId);
  const comments = allComments.filter((c) => round.commentIds.includes(c.id));
  const assignees = getAssignableAgencyUsers();

  return (
    <>
      <TopBar
        breadcrumb={`Royal Creative / Projects / ${project.name}`}
        action={
          <NotificationsBell iconOnly />
        }
      />
      <PageHeader
        eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
        title={`Development revision · Round ${round.roundNumber}`}
        description={`${project.name} · Separate from design revisions.`}
      />
      <Badge>{round.workflowStatus.replace("_", " ")}</Badge>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Assigned development work</h2>
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-center justify-between gap-4 rounded-rc-control bg-surface-2 p-4">
            <div className="flex flex-col gap-1">
              <p className="text-[13px] font-medium text-ink">{pinLabel(comment)}</p>
              <p className="text-xs text-ink-secondary">{comment.body}</p>
            </div>
            <PinStatusSelect apiPath={`/api/projects/${projectId}/development/pins/${comment.id}/status`} initialStatus={comment.status} />
          </div>
        ))}
        <RevisionTrackingForm
          apiPath={`/api/projects/${projectId}/development/revision-rounds/${round.id}/tracking`}
          assignees={assignees}
          initialAssigneeId={round.assigneeId}
          initialTargetDate={round.targetDate}
          initialWorkflowStatus={round.workflowStatus}
          assigneeLabel="Developer"
        />
        <Button href={`/agency/projects/${projectId}/development/submit`} variant="primary" className="w-[220px]">
          Submit revised development
        </Button>
      </Card>

      <Card className="flex flex-col gap-3 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Scope review</h2>
        <p className="text-sm text-ink-secondary">
          Development has no revision allowance — if this work goes beyond the agreed scope, flag it as a separate scope change. Existing
          work continues either way.
        </p>
        <CreateScopeChangeForm projectId={projectId} roundId={round.id} />
      </Card>
    </>
  );
}
