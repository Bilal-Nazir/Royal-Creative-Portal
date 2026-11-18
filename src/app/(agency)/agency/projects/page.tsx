import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { getProjectsForAgencyUser } from "@/server/services/project-service";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ProjectsBoard } from "@/components/project/ProjectsBoard";

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
      <PageHeader
        eyebrow="AGENCY WORKSPACE"
        title="Projects"
        description={`Showing ${projects.length} active project${projects.length === 1 ? "" : "s"}. Open a card to see its project journey.`}
        action={
          <Button href="/agency/projects/new" variant="primary" className="w-[196px]">
            Create project
          </Button>
        }
      />
      <ProjectsBoard projects={projects} />
    </>
  );
}
