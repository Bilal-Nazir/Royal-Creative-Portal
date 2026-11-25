import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getHandoverResources } from "@/server/services/handover-service";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ListRow } from "@/components/ui/ListRow";
import { Badge } from "@/components/ui/Badge";

const RESOURCE_CTA: Record<string, string> = { pdf: "Download", video: "Watch", link: "Open" };

/** C15 · Handover — live website link, handover resources, a support button that opens the project conversation. */
export default async function HandoverPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/dashboard");

  const resources = await getHandoverResources(projectId);

  return (
    <>
      <TopBar
        breadcrumb={`My projects  /  ${project.clientName}`}
        action={
          <NotificationsBell iconOnly />
        }
      />
      <PageHeader
        title="Your website is live."
        description="Find your website guide, training video and post-launch support below."
      />
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">{project.name}</h2>
        <p className="text-sm text-ink-secondary">{project.liveUrl}</p>
        {project.liveUrl ? (
          <Button href={project.liveUrl} variant="primary" className="w-[196px]">
            Visit live website ↗
          </Button>
        ) : null}
      </Card>
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Handover resources</h2>
        {resources.map((resource) => (
          <ListRow
            key={resource.id}
            href={resource.fileId ? `/api/files/${resource.fileId}` : resource.url}
            title={resource.title}
            subtitle={resource.type.toUpperCase()}
            trailing={<Badge>{RESOURCE_CTA[resource.type]}</Badge>}
          />
        ))}
        {resources.length === 0 ? <p className="text-sm text-ink-secondary">No resources shared yet.</p> : null}
      </Card>
      <Card className="flex flex-col gap-2 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Support and maintenance</h2>
        <p className="text-sm text-ink-secondary">Questions about updates or an issue with your live site?</p>
        <Button href={`/projects/${projectId}/conversation`} variant="primary" className="w-[196px]">
          Contact Royal Creative
        </Button>
      </Card>
    </>
  );
}
