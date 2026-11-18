import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { getProjectsForAgencyUser } from "@/server/services/project-service";
import { STAGE_LABELS } from "@/server/domain/stage";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ListRow } from "@/components/ui/ListRow";
import { Badge } from "@/components/ui/Badge";

export default async function AgencyProjectsPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") {
    redirect("/sign-in");
  }

  const projects = await getProjectsForAgencyUser(session);

  return (
    <>
      <TopBar
        breadcrumb="Royal Creative / Projects"
        action={
          <Button variant="secondary" className="w-[200px]">
            Notifications
          </Button>
        }
      />
      <PageHeader eyebrow="AGENCY WORKSPACE" title="Projects" description="Every project assigned to you." />
      <Card className="flex flex-col gap-3 p-6">
        {projects.map((project) => (
          <ListRow
            key={project.id}
            title={project.name}
            subtitle={`Client · ${project.clientName} · ${STAGE_LABELS[project.stage]} stage`}
            trailing={
              <div className="flex items-center gap-3">
                <Badge>{project.statusLabel}</Badge>
                <Button href={`/agency/projects/${project.id}`} variant="primary" className="w-[150px]">
                  Open project
                </Button>
              </div>
            }
          />
        ))}
        {projects.length === 0 ? <p className="text-sm text-ink-secondary">No projects assigned to you yet.</p> : null}
      </Card>
    </>
  );
}
