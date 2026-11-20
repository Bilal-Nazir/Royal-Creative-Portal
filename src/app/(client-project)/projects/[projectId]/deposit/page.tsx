import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getDepositInvoice } from "@/server/services/invoice-service";
import { canAct } from "@/server/services/permissions";
import { formatGBP, formatDate } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DepositCheckoutForm } from "./checkout-form";

export default async function DepositPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/dashboard");

  const invoice = await getDepositInvoice(projectId);
  if (!invoice) redirect("/dashboard");

  const userCanAct = canAct(session);
  const breadcrumb = `My projects  /  ${project.clientName}`;
  const notifications = (
    <NotificationsBell className="w-[180px]" />
  );

  if (invoice.status === "paid") {
    return (
      <>
        <TopBar breadcrumb={breadcrumb} action={notifications} />
        <PageHeader
          eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
          title="Deposit paid"
          description={`Your ${formatGBP(invoice.amount)} deposit is confirmed. You can now share your project content and files.`}
        />
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">Payment summary</h2>
          <p className="text-sm text-ink-secondary">
            {formatGBP(invoice.amount)} paid by {invoice.paymentMethod ?? "card"} · Invoice {invoice.invoiceNumber}
          </p>
          <Button href="/dashboard" variant="primary" className="w-[196px]">
            Continue to content
          </Button>
        </Card>
      </>
    );
  }

  const lastFailed = Boolean(invoice.lastFailureReason);

  return (
    <>
      <TopBar breadcrumb={breadcrumb} action={notifications} />
      <PageHeader
        eyebrow={`${project.clientName.toUpperCase()} · WEBSITE PROJECT`}
        title={lastFailed ? "Payment unsuccessful" : "Pay your deposit"}
        description={
          lastFailed
            ? "Your deposit is still unpaid. Try again with the same card or use another card."
            : `Pay the ${formatGBP(invoice.amount)} deposit to move your project to the content stage.`
        }
      />

      {invoice.status === "promised" && invoice.promisedDate ? (
        <Card className="flex flex-col gap-2 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">You&apos;ve chosen a payment date</h2>
          <p className="text-sm text-ink-secondary">
            You told us you&apos;ll pay by {formatDate(invoice.promisedDate)}. You can still pay now below.
          </p>
        </Card>
      ) : null}

      {invoice.status === "unverified" ? (
        <Card className="flex flex-col gap-2 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">Bank transfer reported</h2>
          <p className="text-sm text-ink-secondary">
            You told us you&apos;ve paid by bank transfer. Royal Creative hasn&apos;t verified this yet — your project will
            move to the content stage once they confirm it.
          </p>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">
          {lastFailed ? `Deposit due · ${formatGBP(invoice.amount)}` : "Card payment"}
        </h2>
        {lastFailed ? (
          <p className="text-sm text-ink-secondary">Invoice {invoice.invoiceNumber}</p>
        ) : (
          <p className="text-sm text-ink-secondary">Secure checkout powered by Stripe (demo mode)</p>
        )}
        {userCanAct ? <DepositCheckoutForm projectId={projectId} amount={invoice.amount} /> : null}
      </Card>

      {lastFailed && userCanAct ? (
        <Button href={`/projects/${projectId}/deposit/choose-date`} variant="secondary" className="w-[260px]">
          Choose a different payment date
        </Button>
      ) : null}
    </>
  );
}
