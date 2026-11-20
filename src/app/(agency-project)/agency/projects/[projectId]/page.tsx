import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getInternalComments } from "@/server/services/internal-comment-service";
import { getScopeChanges } from "@/server/services/scope-change-service";
import { getBriefForProject } from "@/server/services/brief-service";
import { userRepository } from "@/server/repositories/container";
import { isClientUser } from "@/server/domain/user";
import { formatDate, formatGBP } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ListRow } from "@/components/ui/ListRow";
import { AssigneeChip } from "@/components/ui/AssigneeChip";
import { CreateScopeChangeForm } from "@/components/project/CreateScopeChangeForm";
import { SkipBriefButton } from "@/components/project/SkipBriefButton";
import { InviteClientButton } from "@/components/project/InviteClientButton";
import { InternalCommentForm } from "./internal-comment-form";

const SCOPE_CHANGE_TONE: Record<string, "success" | "warning" | "neutral"> = { accepted: "success", declined: "neutral", pending: "warning" };

export default async function AgencyProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/agency/projects");

  const [comments, scopeChanges, brief, clientUsers] = await Promise.all([
    getInternalComments(projectId),
    getScopeChanges(projectId),
    getBriefForProject(projectId),
    userRepository.listClientUsers(),
  ]);

  const canSkipBrief =
    (session.agencyRole === "owner" || session.agencyRole === "admin") &&
    project.stage === "brief" &&
    (!brief || brief.status === "draft");
  const hasClientAccount = clientUsers.filter(isClientUser).some((u) => u.clientId === project.clientId);

  return (
    <>
      <TopBar
        breadcrumb={`Royal Creative / Projects / ${project.name}`}
        action={
          <NotificationsBell className="w-[200px]" />
        }
      />
      <PageHeader
        title={project.name}
        action={
          <Button href="/agency/projects" variant="secondary" className="w-[220px]">
            Back to projects
          </Button>
        }
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <Card className="flex flex-1 flex-col gap-5 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">Project details</h2>
          <div className="flex flex-col gap-2">
            <h3 className="font-heading text-base font-semibold text-ink">Assignee</h3>
            <AssigneeChip name={project.assigneeName} />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-heading text-base font-semibold text-ink">Description</h3>
            <p className="max-w-[520px] text-[15px] leading-relaxed text-ink-secondary">{project.description}</p>
          </div>
          {canSkipBrief ? (
            <div className="flex flex-col gap-2">
              <h3 className="font-heading text-base font-semibold text-ink">Stage control</h3>
              <SkipBriefButton projectId={projectId} />
            </div>
          ) : null}
          {!hasClientAccount ? (
            <div className="flex flex-col gap-2">
              <h3 className="font-heading text-base font-semibold text-ink">Client access</h3>
              <p className="text-sm text-ink-secondary">{project.clientName} doesn&apos;t have a sign-in yet.</p>
              <InviteClientButton clientId={project.clientId} />
            </div>
          ) : null}
        </Card>

        <Card className="flex w-full flex-col gap-4 p-6 lg:w-[450px] lg:shrink-0">
          <h2 className="font-heading text-lg font-semibold text-ink">Team comments</h2>
          <p className="text-[13px] text-ink-secondary/70">Visible to the Royal Creative team</p>
          <InternalCommentForm projectId={projectId} />
          <div className="flex flex-col gap-2">
            {comments.map((comment) => (
              <div key={comment.id} className="flex flex-col gap-[7px] rounded-[10px] bg-surface-2 p-3">
                <p className="text-[13px] text-ink-secondary/70">
                  Internal note · {comment.authorName} · {formatDate(comment.createdAt)}
                </p>
                <p className="max-w-[378px] text-sm text-ink">{comment.body}</p>
              </div>
            ))}
            {comments.length === 0 ? <p className="text-sm text-ink-secondary">No team comments yet.</p> : null}
          </div>
        </Card>
      </div>

      <Card className="flex flex-col gap-3 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Scope changes</h2>
        {scopeChanges.map((change) => (
          <ListRow
            key={change.id}
            title={change.title}
            subtitle={`${formatGBP(change.additionalFee)} · ${change.timelineImpact} · ${formatDate(change.createdAt)}`}
            trailing={<Badge tone={SCOPE_CHANGE_TONE[change.status]}>{change.status}</Badge>}
          />
        ))}
        {scopeChanges.length === 0 ? <p className="text-sm text-ink-secondary">No scope changes yet.</p> : null}
        <CreateScopeChangeForm projectId={projectId} />
      </Card>
    </>
  );
}
