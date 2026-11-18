import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getBriefForProject } from "@/server/services/brief-service";
import { formatDate } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BriefEditorForm } from "./brief-editor-form";

export default async function BriefEditorPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/agency/projects");

  const brief = await getBriefForProject(projectId);
  const fields = brief?.fields ?? { objective: "", audience: "", pages: "", features: "", deliverables: "" };

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
        eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
        title="Prepare the website brief"
        description="Draft edits remain private until you send this version to the client."
      />
      {brief ? <Badge>{brief.status.replace("_", " ")} · Version {brief.versionNumber}</Badge> : <Badge>New brief</Badge>}

      <Card className="flex flex-col gap-5 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Requirements</h2>
        <BriefEditorForm projectId={projectId} initial={fields} />
      </Card>

      {brief?.status === "changes_requested" && brief.revisionRequestedText ? (
        <Card className="flex flex-col gap-2 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">Client feedback from Version {brief.versionNumber}</h2>
          <p className="max-w-[1096px] text-sm text-ink-secondary">{brief.revisionRequestedText}</p>
          {brief.revisionRequestedAt ? (
            <p className="text-xs text-ink-secondary">Received {formatDate(brief.revisionRequestedAt)}</p>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}
