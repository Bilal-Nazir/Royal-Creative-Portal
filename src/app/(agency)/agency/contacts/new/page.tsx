import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { listStages } from "@/server/services/contact-service";
import { getAssignableAgencyUsers } from "@/server/services/project-service";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { AddContactForm } from "./add-contact-form";

export default async function AddContactPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") redirect("/sign-in");

  const stages = await listStages();
  const owners = getAssignableAgencyUsers();

  return (
    <>
      <TopBar
        breadcrumb="Royal Creative / Contacts"
        action={
          <div className="flex gap-3">
            <NotificationsBell className="w-[200px]" />
            <Button href="/agency/contacts" variant="secondary" className="w-[180px]">
              Back to contacts
            </Button>
          </div>
        }
      />
      <PageHeader
        eyebrow="AGENCY WORKSPACE"
        title="Add a contact"
        description="Create a lead or client record before sending a proposal or inviting them to a project."
      />
      <AddContactForm stages={stages} owners={owners} />
    </>
  );
}
