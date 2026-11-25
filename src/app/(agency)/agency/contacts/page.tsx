import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { listContacts, listStages } from "@/server/services/contact-service";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { ContactsBoard } from "@/components/project/ContactsBoard";

export default async function AgencyContactsPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") {
    redirect("/sign-in");
  }

  const [contacts, stages] = await Promise.all([listContacts(), listStages()]);

  return (
    <div className="flex flex-col gap-3">
      <TopBar breadcrumb="Royal Creative / Contacts" action={<NotificationsBell iconOnly />} />
      <PageHeader title="Contacts" />
      <ContactsBoard contacts={contacts} stages={stages} />
    </div>
  );
}
