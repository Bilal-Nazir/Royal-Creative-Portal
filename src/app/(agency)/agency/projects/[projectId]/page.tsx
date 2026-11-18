import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getBriefForProject } from "@/server/services/brief-service";
import { getProposalForProject, getAcceptanceRecords } from "@/server/services/proposal-service";
import { getDepositInvoice } from "@/server/services/invoice-service";
import { STAGE_LABELS } from "@/server/domain/stage";
import { formatGBP, formatDate } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BriefDocument } from "@/components/project/BriefDocument";
import { ProposalDocument } from "@/components/project/ProposalDocument";
import { ReviseBriefForm } from "./revise-brief-form";
import { ReviseProposalForm } from "./revise-proposal-form";
import { VerifyPaymentButton } from "./verify-payment-button";

export default async function AgencyProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/agency/projects");

  const canManage =
    session.agencyRole === "owner" || session.agencyRole === "admin" || project.assigneeId === session.userId;

  const [brief, proposal, invoice, acceptanceRecords] = await Promise.all([
    getBriefForProject(projectId),
    getProposalForProject(projectId),
    getDepositInvoice(projectId),
    getAcceptanceRecords(projectId),
  ]);
  const acceptance = acceptanceRecords[acceptanceRecords.length - 1];

  return (
    <>
      <TopBar
        breadcrumb={`Royal Creative / Projects / ${project.name}`}
        action={
          <Button variant="secondary" className="w-[200px]">
            Notifications
          </Button>
        }
      />
      <PageHeader
        eyebrow="AGENCY WORKSPACE"
        title={project.name}
        description={`Client · ${project.clientName} · Current stage · ${STAGE_LABELS[project.stage]}`}
      />

      {brief ? (
        <Card className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold text-ink">Brief</h2>
            <Badge tone={brief.status === "changes_requested" ? "warning" : brief.status === "approved" ? "success" : "neutral"}>
              {brief.status.replace("_", " ")}
            </Badge>
          </div>

          {brief.status === "changes_requested" ? (
            <>
              <div className="rounded-rc-control bg-surface-2 p-4">
                <p className="text-[13px] font-medium text-ink">Client requested changes</p>
                <p className="mt-1 text-sm text-ink-secondary">{brief.revisionRequestedText}</p>
              </div>
              {canManage ? <ReviseBriefForm projectId={projectId} current={brief.fields} /> : null}
            </>
          ) : (
            <p className="text-sm text-ink-secondary">
              {brief.status === "approved"
                ? `Approved by ${brief.approvedByName} on ${brief.approvedAt ? formatDate(brief.approvedAt) : ""}`
                : `Version ${brief.versionNumber} sent by ${brief.createdByName} on ${formatDate(brief.createdAt)} — awaiting client review.`}
            </p>
          )}

          <BriefDocument title={`Website brief · Version ${brief.versionNumber}`} fields={brief.fields} variant="dark" />
        </Card>
      ) : null}

      {proposal ? (
        <Card className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold text-ink">Proposal</h2>
            <Badge tone={proposal.status === "changes_requested" ? "warning" : proposal.status === "accepted" ? "success" : "neutral"}>
              {proposal.status.replace("_", " ")}
            </Badge>
          </div>

          {proposal.status === "changes_requested" ? (
            <>
              <div className="rounded-rc-control bg-surface-2 p-4">
                <p className="text-[13px] font-medium text-ink">Client requested changes</p>
                <p className="mt-1 text-sm text-ink-secondary">{proposal.changesRequestedText}</p>
              </div>
              {canManage ? (
                <ReviseProposalForm
                  projectId={projectId}
                  current={proposal.fields}
                  fee={proposal.fee}
                  paymentSchedule={proposal.paymentSchedule}
                />
              ) : null}
            </>
          ) : (
            <p className="text-sm text-ink-secondary">
              {proposal.status === "accepted" && acceptance
                ? `Accepted by ${acceptance.userName} on ${formatDate(acceptance.acceptedAt)} · ${formatGBP(acceptance.amount)}`
                : `Version ${proposal.versionNumber} sent by ${proposal.createdByName} on ${formatDate(proposal.createdAt)} — awaiting client decision.`}
            </p>
          )}

          <ProposalDocument title={`Proposal Version ${proposal.versionNumber} · ${formatGBP(proposal.fee)}`} fields={proposal.fields} />
        </Card>
      ) : null}

      {invoice ? (
        <Card className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold text-ink">Deposit</h2>
            <Badge tone={invoice.status === "paid" ? "success" : invoice.status === "unverified" ? "warning" : "neutral"}>
              {invoice.status}
            </Badge>
          </div>
          <p className="text-sm text-ink-secondary">
            {formatGBP(invoice.amount)} · Invoice {invoice.invoiceNumber} · Due {formatDate(invoice.dueDate)}
          </p>
          {invoice.status === "paid" ? (
            <p className="text-sm text-ink-secondary">
              {invoice.verifiedByName
                ? `Verified by ${invoice.verifiedByName} on ${invoice.verifiedAt ? formatDate(invoice.verifiedAt) : ""}`
                : `Paid by ${invoice.paymentMethod ?? "card"}${invoice.paidAt ? ` on ${formatDate(invoice.paidAt)}` : ""}`}
            </p>
          ) : (
            <>
              {invoice.status === "unverified" ? (
                <p className="text-sm text-ink-secondary">Client reported a bank transfer — not yet confirmed.</p>
              ) : null}
              {invoice.promisedDate ? (
                <p className="text-sm text-ink-secondary">Client promised to pay by {formatDate(invoice.promisedDate)}.</p>
              ) : null}
              {canManage ? <VerifyPaymentButton projectId={projectId} /> : null}
            </>
          )}
        </Card>
      ) : null}
    </>
  );
}
