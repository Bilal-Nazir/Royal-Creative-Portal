import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getContentChecklist, getContentSubmissions } from "@/server/services/content-service";
import { getUploadedFilesMeta } from "@/server/services/file-service";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CONTENT_STATUS_LABEL, CONTENT_STATUS_TONE } from "@/components/project/content-status";
import { ReviewActions } from "./review-actions";
import { ForceAdvanceButton } from "./force-advance-button";

export default async function AgencyContentReviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/agency/projects");

  const [items, submissions] = await Promise.all([getContentChecklist(projectId), getContentSubmissions(projectId)]);

  return (
    <>
      <TopBar
        breadcrumb={`Royal Creative / Projects / ${project.name}`}
        action={
          <NotificationsBell className="w-[180px]" />
        }
      />
      <PageHeader
        eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
        title="Client content"
        description="Text, files and links shared by the client."
      />

      {await Promise.all(items.map(async (item) => {
        const itemSubmissions = submissions
          .filter((s) => s.checklistItemId === item.id)
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        const latest = itemSubmissions[0];
        const attachments = latest ? await getUploadedFilesMeta(latest.fileIds) : [];

        return (
          <Card key={item.id} className="flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-semibold text-ink">{item.label}</h2>
              <Badge tone={CONTENT_STATUS_TONE[item.status]}>{CONTENT_STATUS_LABEL[item.status]}</Badge>
            </div>

            {latest ? (
              <>
                {latest.notes ? <p className="text-sm text-ink-secondary">{latest.notes}</p> : null}
                {attachments.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    <p className="font-heading text-base font-semibold text-ink">Attachments</p>
                    {attachments.map((file) => (
                      <a key={file.id} href={`/api/files/${file.id}`} className="text-sm text-ink-secondary hover:underline">
                        {file.originalName}
                      </a>
                    ))}
                  </div>
                ) : null}
                {latest.sharedLink ? <p className="text-sm text-ink-secondary">{latest.sharedLink}</p> : null}
                {item.status === "submitted" ? <ReviewActions projectId={projectId} submissionId={latest.id} /> : null}
              </>
            ) : (
              <p className="text-sm text-ink-secondary">Nothing submitted yet.</p>
            )}
          </Card>
        );
      }))}

      <Card className="flex flex-col gap-3 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Stage control</h2>
        <p className="text-sm text-ink-secondary">
          An admin or owner can move this project into Design even if required content is outstanding.
        </p>
        <ForceAdvanceButton projectId={projectId} />
      </Card>
    </>
  );
}
