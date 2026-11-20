import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getDepositInvoice } from "@/server/services/invoice-service";
import { formatGBP } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { MarkPaidActions } from "./mark-paid-actions";

export default async function UpdatePaymentStatusPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/agency/projects");

  const invoice = await getDepositInvoice(projectId);
  if (!invoice) redirect(`/agency/projects/${projectId}`);

  const isUnverified = invoice.status === "unverified";
  const isPaid = invoice.status === "paid";

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
        title="Update payment status"
        description={`${project.name} · Invoice ${invoice.invoiceNumber} · ${formatGBP(invoice.amount)}`}
      />

      <Card className="flex flex-col gap-4 p-6">
        {isPaid ? (
          <>
            <h2 className="font-heading text-xl font-semibold text-ink">Payment confirmed</h2>
            <p className="text-sm text-ink-secondary">
              {invoice.verifiedByName
                ? `Verified by ${invoice.verifiedByName}.`
                : `Marked paid${invoice.paymentMethod ? ` by ${invoice.paymentMethod}` : ""}.`}
            </p>
          </>
        ) : isUnverified ? (
          <>
            <h2 className="font-heading text-xl font-semibold text-ink">Verify this payment</h2>
            <p className="text-sm text-ink-secondary">
              The client reported sending {formatGBP(invoice.amount)} outside Stripe — confirm it arrived before
              marking this invoice paid.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-heading text-xl font-semibold text-ink">Mark as paid manually</h2>
            <p className="text-sm text-ink-secondary">
              Confirm that you received the {formatGBP(invoice.amount)} deposit outside Stripe.
            </p>
          </>
        )}

        {!isPaid ? <MarkPaidActions projectId={projectId} isUnverified={isUnverified} /> : null}
      </Card>
    </>
  );
}
