import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { getAssignableAgencyUsers, getClientDirectory } from "@/server/services/project-service";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { NewProjectForm } from "./new-project-form";

export default async function NewProjectPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") redirect("/sign-in");

  const [assignees, clients] = [getAssignableAgencyUsers(), getClientDirectory()];

  return (
    <>
      <TopBar
        breadcrumb="Royal Creative / Projects / Create project"
        action={
          <Button variant="secondary" className="w-[200px]">
            Notifications
          </Button>
        }
      />
      <PageHeader title="Create a project" />
      <NewProjectForm assignees={assignees} clients={clients} />
    </>
  );
}
