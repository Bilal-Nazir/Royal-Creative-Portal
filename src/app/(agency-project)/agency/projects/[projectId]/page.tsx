import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getInternalComments } from "@/server/services/internal-comment-service";
import { formatDate } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AssigneeChip } from "@/components/ui/AssigneeChip";
import { InternalCommentForm } from "./internal-comment-form";

export default async function AgencyProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/agency/projects");

  const comments = await getInternalComments(projectId);

  return (
    <>
      <TopBar
        breadcrumb={`Royal Creative / Projects / ${project.name}`}
        action={
          <Button variant="secondary" className="w-[200px]">
            Notifications
          </Button>
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
    </>
  );
}
