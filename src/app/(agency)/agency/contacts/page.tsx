import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { listContacts, listStages } from "@/server/services/contact-service";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ContactsBoard } from "@/components/project/ContactsBoard";

export default async function AgencyContactsPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") {
    redirect("/sign-in");
  }

  const [contacts, stages] = await Promise.all([listContacts(), listStages()]);

  return (
    <>
      <TopBar breadcrumb="Royal Creative / Contacts" action={<NotificationsBell className="w-[200px]" />} />
      <PageHeader
        eyebrow="AGENCY WORKSPACE"
        title="Contacts"
        description="Track enquiries from first contact to a decision."
        action={
          <Button href="/agency/contacts/new" variant="primary" className="w-[180px]">
            Add contact
          </Button>
        }
      />
      <ContactsBoard contacts={contacts} stages={stages} />
    </>
  );
}
