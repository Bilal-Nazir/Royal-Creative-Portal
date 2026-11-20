import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { getAssignableAgencyUsers, getClientDirectory } from "@/server/services/project-service";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { NewProjectForm } from "./new-project-form";

export default async function NewProjectPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") redirect("/sign-in");

  const [assignees, clients] = [getAssignableAgencyUsers(), await getClientDirectory()];

  return (
    <>
      <TopBar
        breadcrumb="Royal Creative / Projects / Create project"
        action={
          <NotificationsBell className="w-[200px]" />
        }
      />
      <PageHeader title="Create a project" />
      <NewProjectForm assignees={assignees} clients={clients} />
    </>
  );
}
