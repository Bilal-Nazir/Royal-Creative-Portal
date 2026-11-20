import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getProposalForProject } from "@/server/services/proposal-service";
import { getBriefForProject } from "@/server/services/brief-service";
import { formatDate } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ProposalEditorForm } from "./proposal-editor-form";

export default async function ProposalEditorPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/agency/projects");

  const [proposal, brief] = await Promise.all([getProposalForProject(projectId), getBriefForProject(projectId)]);
  const fields = proposal?.fields ?? { scope: "", timeline: "", revisions: "", exclusions: "" };
  const briefSkipped = brief?.status === "skipped";

  return (
    <>
      <TopBar
        breadcrumb={`Royal Creative / Projects / ${project.name}`}
        action={
          <NotificationsBell className="w-[200px]" />
        }
      />
      <PageHeader
        eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
        title="Prepare your proposal"
        description={briefSkipped ? undefined : "Use the approved brief as the scope baseline."}
      />
      {proposal ? <Badge>{proposal.status.replace("_", " ")} · Version {proposal.versionNumber}</Badge> : <Badge>New proposal</Badge>}

      <Card className="flex flex-col gap-5 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Scope and commercial details</h2>
        <ProposalEditorForm
          projectId={projectId}
          initial={fields}
          initialFee={proposal?.fee ?? 0}
          initialSchedule={proposal?.paymentSchedule ?? []}
          initialIncludedRevisionRounds={proposal?.includedRevisionRounds ?? 2}
        />
      </Card>

      {proposal?.status === "changes_requested" && proposal.changesRequestedText ? (
        <Card className="flex flex-col gap-2 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">Client feedback from Version {proposal.versionNumber}</h2>
          <p className="max-w-[1096px] text-sm text-ink-secondary">{proposal.changesRequestedText}</p>
          {proposal.changesRequestedAt ? (
            <p className="text-xs text-ink-secondary">Received {formatDate(proposal.changesRequestedAt)}</p>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}
