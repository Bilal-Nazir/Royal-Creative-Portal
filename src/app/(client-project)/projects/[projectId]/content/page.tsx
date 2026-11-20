import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getContentChecklist } from "@/server/services/content-service";
import { canAct } from "@/server/services/permissions";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CONTENT_STATUS_LABEL, CONTENT_STATUS_TONE } from "@/components/project/content-status";
import { ReadOnlyNotice } from "@/components/project/ReadOnlyNotice";
import { ContentSubmissionForm } from "./content-submission-form";

export default async function ContentPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/dashboard");

  const items = await getContentChecklist(projectId);
  const acceptedCount = items.filter((i) => i.status === "accepted").length;
  const userCanAct = canAct(session);

  return (
    <>
      <TopBar
        breadcrumb={`My projects  /  ${project.clientName}`}
        action={
          <NotificationsBell className="w-[180px]" />
        }
      />
      <PageHeader
        eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
        title="Share your website content"
        description={`${acceptedCount} of ${items.length} items accepted. Update your website copy and share your images or videos.`}
      />

      {!userCanAct ? <ReadOnlyNotice action="submitting content" /> : null}

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Content checklist</h2>
        {items.map((item) => (
          <div key={item.id} className="flex flex-col gap-3 rounded-rc-control bg-surface-2 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-medium text-ink">{item.label}</p>
              <Badge tone={CONTENT_STATUS_TONE[item.status]}>{CONTENT_STATUS_LABEL[item.status]}</Badge>
            </div>
            {userCanAct && (item.status === "not_started" || item.status === "changes_requested") ? (
              <ContentSubmissionForm projectId={projectId} checklistItemId={item.id} />
            ) : null}
          </div>
        ))}
        {items.length === 0 ? <p className="text-sm text-ink-secondary">No content checklist items yet.</p> : null}
      </Card>
    </>
  );
}
