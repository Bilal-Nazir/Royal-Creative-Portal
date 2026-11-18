import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getProposalForProject } from "@/server/services/proposal-service";
import { canAct } from "@/server/services/permissions";
import { formatGBP } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AcceptActions } from "./accept-actions";

export default async function ProposalAcceptPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/dashboard");

  const proposal = await getProposalForProject(projectId);
  if (!proposal) redirect("/dashboard");
  if (!canAct(session)) redirect(`/projects/${projectId}/proposal`);

  const scheduleText = proposal.paymentSchedule
    .map((item) => `${Math.round((item.amount / proposal.fee) * 100)}% ${item.label.toLowerCase()}`)
    .join(" and ");

  return (
    <>
      <TopBar
        breadcrumb={`My projects  /  ${project.clientName}`}
        action={
          <Button variant="secondary" className="w-[180px]">
            Notifications
          </Button>
        }
      />
      <PageHeader
        eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
        title="Confirm your proposal acceptance"
        description="Review the agreed version and terms before confirming."
      />
      <Badge>Confirmation</Badge>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">
          Proposal Version {proposal.versionNumber} · {formatGBP(proposal.fee)}
        </h2>
        <div className="flex flex-col gap-0 text-sm text-ink-secondary">
          <p>{proposal.fields.scope.charAt(0).toUpperCase() + proposal.fields.scope.slice(1)}</p>
          <p>Payment schedule: {scheduleText}.</p>
          <p>Accepting records your agreement to this specific proposal and its linked terms.</p>
        </div>
        <AcceptActions projectId={projectId} />
      </Card>
    </>
  );
}
