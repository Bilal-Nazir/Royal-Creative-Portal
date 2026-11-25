import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { listStages, listContacts } from "@/server/services/contact-service";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { PipelineStagesManager } from "@/components/project/PipelineStagesManager";

export default async function ContactSettingsPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") redirect("/sign-in");
  if (session.agencyRole !== "owner" && session.agencyRole !== "admin") redirect("/agency/contacts");

  const [stages, contacts] = await Promise.all([listStages(), listContacts()]);
  const stageRows = stages.map((stage) => ({
    ...stage,
    contactCount: contacts.filter((c) => c.stageId === stage.id).length,
  }));

  return (
    <>
      <TopBar
        breadcrumb="Royal Creative / Contacts"
        action={
          <div className="flex gap-3">
            <NotificationsBell iconOnly />
            <Button href="/agency/contacts" variant="secondary" className="w-[180px]">
              Back to contacts
            </Button>
          </div>
        }
      />
      <PageHeader title="Contact settings" description="Manage the stages on your contact board." />
      <PipelineStagesManager initialStages={stageRows} />
    </>
  );
}
