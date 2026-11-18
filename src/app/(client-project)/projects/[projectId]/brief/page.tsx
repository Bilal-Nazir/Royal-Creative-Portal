import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getBriefForProject, getBriefComments } from "@/server/services/brief-service";
import { canAct } from "@/server/services/permissions";
import { formatDate } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ListRow } from "@/components/ui/ListRow";
import { NotImplementedButton } from "@/components/ui/NotImplementedButton";
import { BriefDocument } from "@/components/project/BriefDocument";
import { CommentThread } from "@/components/project/CommentThread";
import { BriefApproveActions } from "./approve-actions";

export default async function BriefReviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/dashboard");

  const brief = await getBriefForProject(projectId);
  if (!brief) redirect("/dashboard");

  const comments = await getBriefComments(projectId, brief.id);
  const userCanAct = canAct(session);
  const breadcrumb = `My projects  /  ${project.clientName}`;
  const notifications = (
    <Button variant="secondary" className="w-[180px]">
      Notifications
    </Button>
  );

  if (brief.status === "approved") {
    return (
      <>
        <TopBar breadcrumb={breadcrumb} action={notifications} />
        <PageHeader
          eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
          title="Brief approved"
          description="Royal Creative is preparing your proposal with pricing, deliverables and a timeline. We'll notify you when it's ready to review."
        />
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">Website brief · Version {brief.versionNumber}</h2>
          <p className="text-sm text-ink-secondary">
            Approved by {brief.approvedByName} on {brief.approvedAt ? formatDate(brief.approvedAt) : ""}
          </p>
          <Button href="#approved-brief-document" variant="primary" className="w-[196px]">
            View approved brief
          </Button>
        </Card>
        <div id="approved-brief-document">
          <BriefDocument
            title={`Website brief · Version ${brief.versionNumber}`}
            fields={brief.fields}
            variant="paper"
            action={<NotImplementedButton label="Download PDF brief" />}
          />
        </div>
      </>
    );
  }

  const isChangesRequested = brief.status === "changes_requested";

  return (
    <>
      <TopBar breadcrumb={breadcrumb} action={notifications} />
      <PageHeader
        eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
        title={isChangesRequested ? "Changes requested" : "Let's make sure we've understood."}
        description={
          isChangesRequested
            ? "We've sent your requested changes to Royal Creative — we'll let you know when a revised brief is ready."
            : "Review the brief before we prepare your proposal."
        }
      />
      <Badge tone={isChangesRequested ? "warning" : "neutral"}>
        {isChangesRequested ? "Changes requested" : "Awaiting your review"}
      </Badge>

      <BriefDocument
        title={`Website brief · Version ${brief.versionNumber}`}
        fields={brief.fields}
        variant="paper"
        action={<NotImplementedButton label="Download PDF brief" />}
      />

      <Card className="flex flex-col gap-4 px-6 py-3">
        <CommentThread comments={comments} canPost={userCanAct} postUrl={`/api/projects/${projectId}/brief/comments`} />
        {!isChangesRequested && userCanAct ? <BriefApproveActions projectId={projectId} /> : null}
      </Card>

      <Card className="flex flex-col gap-2 px-6 py-3">
        <h2 className="font-heading text-xl font-semibold text-ink">Version history</h2>
        <ListRow
          title={`Version ${brief.versionNumber}`}
          subtitle={`Submitted by ${brief.createdByName} · ${formatDate(brief.createdAt)}`}
          trailing={<Badge>Current</Badge>}
        />
      </Card>
    </>
  );
}
