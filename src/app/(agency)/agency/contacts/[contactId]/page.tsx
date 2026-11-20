import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { getContact, listStages, listContactActivity } from "@/server/services/contact-service";
import { proposalRepository, projectRepository, userRepository } from "@/server/repositories/container";
import { isClientUser } from "@/server/domain/user";
import { formatDate, formatGBP } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ListRow } from "@/components/ui/ListRow";
import { LogFollowUpForm } from "@/components/project/LogFollowUpForm";
import { InviteClientButton } from "@/components/project/InviteClientButton";

export default async function ContactDetailPage({ params }: { params: Promise<{ contactId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") redirect("/sign-in");

  const { contactId } = await params;
  const contact = await getContact(contactId);
  if (!contact) redirect("/agency/contacts");

  const [stages, activity, project] = await Promise.all([
    listStages(),
    listContactActivity(contactId),
    contact.proposalProjectId ? projectRepository.findById(contact.proposalProjectId) : Promise.resolve(null),
  ]);
  const stage = stages.find((s) => s.id === contact.stageId);
  const proposal = project ? await proposalRepository.getCurrentVersion(project.id) : null;
  const hasClientAccount = project
    ? (await userRepository.listClientUsers()).filter(isClientUser).some((u) => u.clientId === project.clientId)
    : false;

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
        title={contact.name}
        description={`${contact.company} · ${contact.email}${contact.ownerName ? ` · Owner: ${contact.ownerName}` : ""}`}
      />

      <Card className="flex flex-col gap-4 p-6">
        <ListRow title="Pipeline stage" subtitle={stage?.name ?? "Unknown"} />
        <ListRow title="Next follow-up" subtitle={contact.nextFollowUpAt ? formatDate(contact.nextFollowUpAt) : "Not scheduled"} />
        {proposal ? (
          <ListRow
            title="Proposal"
            subtitle={`${project?.name} · v${proposal.versionNumber} · ${formatGBP(proposal.fee)} · ${
              proposal.status === "accepted" ? "Accepted" : proposal.status === "sent" ? "Awaiting response" : "Changes requested"
            }`}
          />
        ) : null}
        {project ? <ListRow title="Project" subtitle={project.name} /> : null}
        {contact.notes ? <ListRow title="Notes" subtitle={contact.notes} /> : null}
        <div className="flex flex-wrap gap-3">
          {project ? (
            <Button href={`/agency/projects/${project.id}`} variant="primary" className="w-[196px]">
              Open linked project
            </Button>
          ) : null}
          <LogFollowUpForm contactId={contact.id} />
          {project && !hasClientAccount ? (
            <InviteClientButton clientId={project.clientId} defaultName={contact.name} defaultEmail={contact.email} />
          ) : null}
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-ink-secondary">No activity yet.</p>
        ) : (
          activity.map((item) => <ListRow key={item.id} title={formatDate(item.createdAt)} subtitle={item.body} />)
        )}
      </Card>
    </>
  );
}
