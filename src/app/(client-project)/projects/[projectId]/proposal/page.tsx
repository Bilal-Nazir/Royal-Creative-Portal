import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getProposalForProject, getAcceptanceRecords } from "@/server/services/proposal-service";
import { canAct } from "@/server/services/permissions";
import { formatGBP, formatDate } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProposalDocument } from "@/components/project/ProposalDocument";

export default async function ProposalReviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/dashboard");

  const proposal = await getProposalForProject(projectId);
  if (!proposal) redirect("/dashboard");

  const userCanAct = canAct(session);
  const breadcrumb = `My projects  /  ${project.clientName}`;
  const notifications = (
    <Button variant="secondary" className="w-[180px]">
      Notifications
    </Button>
  );
  const scheduleText = proposal.paymentSchedule.map((item) => `${formatGBP(item.amount)} ${item.label.toLowerCase()}`).join(" · ");

  if (proposal.status === "accepted") {
    const records = await getAcceptanceRecords(projectId);
    const record = records.find((r) => r.proposalVersionId === proposal.id) ?? records[records.length - 1];

    return (
      <>
        <TopBar breadcrumb={breadcrumb} action={notifications} />
        <PageHeader
          eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
          title="Proposal accepted"
          description="Pay your deposit to move this project into the content stage."
        />
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">
            Proposal Version {proposal.versionNumber} · {formatGBP(proposal.fee)}
          </h2>
          {record ? (
            <p className="text-sm text-ink-secondary">
              Accepted by {record.userName} on {formatDate(record.acceptedAt)}
            </p>
          ) : null}
          <Button href={`/projects/${projectId}/deposit`} variant="primary" className="w-[196px]">
            Go to deposit
          </Button>
        </Card>
        <ProposalDocument title={`Website design & development · Version ${proposal.versionNumber}`} fields={proposal.fields} />
      </>
    );
  }

  if (proposal.status === "changes_requested") {
    return (
      <>
        <TopBar breadcrumb={breadcrumb} action={notifications} />
        <PageHeader
          eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
          title="Changes requested"
          description="We've sent your requested changes to Royal Creative — we'll let you know when a revised proposal is ready."
        />
        <Badge tone="warning">Changes requested</Badge>
        <Card className="flex flex-col gap-2 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">
            Proposal Version {proposal.versionNumber} · {formatGBP(proposal.fee)}
          </h2>
          <p className="text-sm text-ink-secondary">{proposal.changesRequestedText}</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <TopBar breadcrumb={breadcrumb} action={notifications} />
      <PageHeader
        eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
        title="A plan for your new website."
        description="Review the scope, investment and delivery milestones."
      />
      <Badge>Awaiting your decision</Badge>

      <ProposalDocument title="Website design & development" fields={proposal.fields} />

      <Card className="flex w-full items-center gap-4 px-[18px] py-3">
        <p className="font-heading text-base font-semibold text-ink">Total {formatGBP(proposal.fee)}</p>
        <p className="flex-1 text-sm text-ink-secondary">{scheduleText}</p>
        {userCanAct ? (
          <>
            <Button href={`/projects/${projectId}/proposal/accept`} variant="primary" className="w-[166px]">
              Accept proposal
            </Button>
            <Button href={`/projects/${projectId}/proposal/changes`} variant="secondary" className="w-[166px]">
              Request changes
            </Button>
          </>
        ) : null}
      </Card>
    </>
  );
}
