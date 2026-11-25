import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { listFilesForSession } from "@/server/services/file-service";
import { formatDate } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/** No Figma frame for the client Files nav page — built from the existing UploadedFile repository and authorized download route (see DESIGN_NOTES). */
export default async function FilesPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") {
    redirect("/sign-in");
  }

  const rows = await listFilesForSession(session);

  return (
    <>
      <TopBar breadcrumb="Files" action={<NotificationsBell iconOnly />} />
      <PageHeader eyebrow="CLIENT PORTAL" title="Files" description="Everything shared on your projects, in both directions." />
      <Card className="flex flex-col gap-3 p-6">
        {rows.length === 0 ? (
          <p className="text-sm text-ink-secondary">No files have been shared yet.</p>
        ) : (
          rows.map(({ file, project }) => (
            <div key={file.id} className="flex flex-col items-start gap-3 rounded-rc-control bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-[13px] font-medium text-ink">{file.originalName}</p>
                <p className="text-xs text-ink-secondary">
                  {project.name} · Shared by {file.uploadedByName} · {formatDate(file.createdAt)}
                </p>
              </div>
              <Button href={`/api/files/${file.id}`} variant="secondary" className="w-[140px]">
                Download
              </Button>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
