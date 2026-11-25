import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { listAllInvoicesWithProject, computePaymentMetrics } from "@/server/services/invoice-service";
import { getAgencySettings } from "@/server/services/settings-service";
import { env } from "@/server/env";
import { formatGBP } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { InvoiceList } from "@/components/project/InvoiceList";

export default async function AgencyPaymentsPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") {
    redirect("/sign-in");
  }

  const [rows, settings] = await Promise.all([listAllInvoicesWithProject(), getAgencySettings()]);
  const metrics = computePaymentMetrics(rows.map((r) => r.invoice));
  const bankDetailsMissing = env.PAYMENT_DRIVER === "bank" && !settings.paymentInstructions.trim();

  return (
    <>
      <TopBar
        breadcrumb="Royal Creative / Payments"
        action={
          <NotificationsBell iconOnly />
        }
      />
      <PageHeader
        title="Payments"
        description="View invoices and record payments received outside Stripe."
        action={
          <Button href="/agency/payments/stripe" variant="secondary" className="w-[220px]">
            Stripe settings
          </Button>
        }
      />

      {bankDetailsMissing ? (
        <Card className="flex flex-col gap-2 p-6">
          <Badge tone="warning">Action needed</Badge>
          <p className="text-sm text-ink-secondary">
            No bank details are set, so clients can&apos;t see where to send payment. Add them in{" "}
            <a href="/agency/settings" className="underline">
              Settings
            </a>
            .
          </p>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Collected" value={formatGBP(metrics.collected)} deltaLabel="Across all paid invoices" />
        <StatCard label="Outstanding" value={formatGBP(metrics.outstanding)} deltaLabel="Unpaid, promised or unverified" />
        <StatCard
          label="Overdue"
          value={formatGBP(metrics.overdue)}
          deltaLabel="Included in outstanding"
          tone={metrics.overdue > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Awaiting verification"
          value={String(metrics.awaitingVerification)}
          deltaLabel="Client-reported transfers"
        />
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Invoices</h2>
        <InvoiceList rows={rows} />
      </Card>
    </>
  );
}
