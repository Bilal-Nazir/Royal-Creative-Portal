import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getFinalInvoice } from "@/server/services/invoice-service";
import { getAgencySettings } from "@/server/services/settings-service";
import { canAct } from "@/server/services/permissions";
import { env } from "@/server/env";
import { formatGBP } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PaymentCheckoutForm } from "@/components/project/PaymentCheckoutForm";
import { BankTransferCheckout } from "@/components/project/BankTransferCheckout";

/**
 * Deviation: Figma has no screen for the final balance payment. Reuses the
 * C08/C09/C10 deposit checkout pattern and the mock PaymentProvider, with
 * "final balance" wording — see DESIGN_NOTES.
 */
export default async function FinalPaymentPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/dashboard");

  const invoice = await getFinalInvoice(projectId);
  if (!invoice) redirect("/dashboard");

  const isBankTransfer = env.PAYMENT_DRIVER === "bank";
  const settings = isBankTransfer ? await getAgencySettings() : null;
  const userCanAct = canAct(session);
  const breadcrumb = `My projects  /  ${project.clientName}`;
  const notifications = (
    <NotificationsBell iconOnly />
  );

  if (invoice.status === "paid") {
    return (
      <>
        <TopBar breadcrumb={breadcrumb} action={notifications} />
        <PageHeader
          title="Final balance paid"
          description={`Your ${formatGBP(invoice.amount)} final balance is confirmed.`}
        />
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">Payment summary</h2>
          <p className="text-sm text-ink-secondary">
            {formatGBP(invoice.amount)} paid by {invoice.paymentMethod ?? "card"} · Invoice {invoice.invoiceNumber}
          </p>
          <Button href={`/projects/${projectId}/launch`} variant="primary" className="w-[196px]">
            Back to launch
          </Button>
        </Card>
      </>
    );
  }

  if (invoice.status === "scheduled") {
    return (
      <>
        <TopBar breadcrumb={breadcrumb} action={notifications} />
        <PageHeader
          title="Final balance not due yet"
          description="Your final balance becomes due once the project reaches Launch."
        />
      </>
    );
  }

  const lastFailed = Boolean(invoice.lastFailureReason);

  return (
    <>
      <TopBar breadcrumb={breadcrumb} action={notifications} />
      <PageHeader
        title={lastFailed ? "Payment unsuccessful" : "Pay your final balance"}
        description={
          lastFailed
            ? "Your final balance is still unpaid. Try again with the same card or use another card."
            : `Pay the ${formatGBP(invoice.amount)} final balance to complete the launch checklist.`
        }
      />
      {invoice.status === "unverified" ? (
        <Card className="flex flex-col gap-2 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">Bank transfer reported</h2>
          <p className="text-sm text-ink-secondary">
            You told us you&apos;ve paid by bank transfer. Royal Creative hasn&apos;t verified this yet — your project will
            complete handover once they confirm it.
          </p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">
            {isBankTransfer ? "Bank transfer" : lastFailed ? `Final balance due · ${formatGBP(invoice.amount)}` : "Card payment"}
          </h2>
          {!isBankTransfer ? (
            lastFailed ? (
              <p className="text-sm text-ink-secondary">Invoice {invoice.invoiceNumber}</p>
            ) : (
              <p className="text-sm text-ink-secondary">Secure checkout powered by Stripe (demo mode)</p>
            )
          ) : null}
          {userCanAct && isBankTransfer ? (
            <BankTransferCheckout
              apiPath={`/api/projects/${projectId}/final-payment/report-transfer`}
              amount={invoice.amount}
              invoiceNumber={invoice.invoiceNumber}
              bankDetails={settings?.paymentInstructions ?? ""}
            />
          ) : userCanAct ? (
            <PaymentCheckoutForm apiPath={`/api/projects/${projectId}/final-payment/pay`} amount={invoice.amount} payLabel="Pay final balance of" />
          ) : null}
        </Card>
      )}
    </>
  );
}
