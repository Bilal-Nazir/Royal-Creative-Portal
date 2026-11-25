import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getRevisionRounds, getPinCommentsForVersion } from "@/server/services/design-service";
import { pinLabel } from "@/server/domain/design";
import { getProposalForProject } from "@/server/services/proposal-service";
import { getAssignableAgencyUsers } from "@/server/services/project-service";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RevisionTrackingForm } from "@/components/project/RevisionTrackingForm";
import { PinStatusSelect } from "@/components/project/PinStatusSelect";
import { FlagScopeButton } from "./flag-scope-button";
import { CreateScopeChangeForm } from "@/components/project/CreateScopeChangeForm";

export default async function RevisionRoundDetailPage({ params }: { params: Promise<{ projectId: string; roundId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") redirect("/sign-in");

  const { projectId, roundId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/agency/projects");

  const rounds = await getRevisionRounds(projectId);
  const round = rounds.find((r) => r.id === roundId);
  if (!round) redirect(`/agency/projects/${projectId}/design`);

  const [allComments, proposal] = await Promise.all([
    getPinCommentsForVersion(round.designVersionId, session.userId),
    getProposalForProject(projectId),
  ]);
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
        title={`Design revision · Round ${round.roundNumber}`}
        description={`${project.name} · ${round.commentIds.length} comments · Submitted by ${round.submittedByName}`}
      />
      <Badge>{round.workflowStatus.replace("_", " ")}</Badge>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Tracked work</h2>
        <RevisionTrackingForm
          apiPath={`/api/projects/${projectId}/design/revision-rounds/${round.id}/tracking`}
          assignees={assignees}
          initialAssigneeId={round.assigneeId}
          initialTargetDate={round.targetDate}
          initialWorkflowStatus={round.workflowStatus}
        />
      </Card>

      <Card className="flex flex-col gap-3 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Requested changes</h2>
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-center justify-between gap-4 rounded-rc-control bg-surface-2 p-4">
            <div className="flex flex-col gap-1">
              <p className="text-[13px] font-medium text-ink">{pinLabel(comment)}</p>
              <p className="text-xs text-ink-secondary">{comment.body}</p>
            </div>
            <PinStatusSelect apiPath={`/api/projects/${projectId}/design/pins/${comment.id}/status`} initialStatus={comment.status} />
          </div>
        ))}
      </Card>

      <Card className="flex flex-col gap-3 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Scope review</h2>
        {round.overAllowance ? (
          <>
            <p className="text-sm text-ink-secondary">
              This is round {round.roundNumber} of {proposal?.includedRevisionRounds ?? 0} included in the agreed proposal &mdash;
              it&apos;s over the allowance. This doesn&apos;t block the work; flag it for a separate scope decision.
            </p>
            {round.scopeFlaggedAt ? (
              <>
                <Badge tone="warning">Flagged for scope decision</Badge>
                <CreateScopeChangeForm projectId={projectId} roundId={round.id} />
              </>
            ) : (
              <FlagScopeButton projectId={projectId} roundId={round.id} />
            )}
          </>
        ) : (
          <p className="text-sm text-ink-secondary">
            This round is included in the agreed design revision allowance ({proposal?.includedRevisionRounds ?? 0} rounds).
          </p>
        )}
      </Card>
    </>
  );
}
