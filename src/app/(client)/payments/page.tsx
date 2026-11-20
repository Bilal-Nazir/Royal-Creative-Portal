import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { listInvoicesForClient } from "@/server/services/invoice-service";
import { formatGBP, formatDate } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { InvoiceStatus, InvoiceType } from "@/server/domain/invoice";

const STATUS_TONE: Record<InvoiceStatus, "neutral" | "success" | "warning" | "info" | "danger"> = {
  scheduled: "neutral",
  unpaid: "info",
  promised: "info",
  unverified: "info",
  partially_paid: "info",
  paid: "success",
  overdue: "warning",
};

const PAYABLE_TYPE_PATH: Partial<Record<InvoiceType, string>> = { deposit: "deposit", final: "final-payment" };
const DUE_STATUSES: InvoiceStatus[] = ["unpaid", "overdue"];

/** No Figma frame for the client Payments nav page — reuses the existing per-project deposit/final-payment checkout pages rather than inventing a new generic checkout (see DESIGN_NOTES). */
export default async function ClientPaymentsPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") {
    redirect("/sign-in");
  }

  const rows = await listInvoicesForClient(session.clientId);

  return (
    <>
      <TopBar breadcrumb="Payments" action={<NotificationsBell className="w-[180px]" />} />
      <PageHeader eyebrow="CLIENT PORTAL" title="Payments" description="Your invoices across every project, with payment status." />
      <Card className="flex flex-col gap-2.5 p-6">
        {rows.length === 0 ? (
          <p className="text-sm text-ink-secondary">No invoices yet.</p>
        ) : (
          rows.map(({ invoice, project }) => {
            const payPath = PAYABLE_TYPE_PATH[invoice.type];
            const canPay = payPath && DUE_STATUSES.includes(invoice.status);
            return (
              <div key={invoice.id} className="flex flex-wrap items-center gap-4 rounded-[10px] bg-surface-2 p-3.5">
                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-[13px] font-medium text-ink">
                    {project.name} · {invoice.type}
                  </p>
                  <p className="text-xs text-ink-secondary">
                    {formatGBP(invoice.amount)} due · {formatDate(invoice.dueDate)}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[invoice.status]}>{invoice.status.replace("_", " ")}</Badge>
                {canPay ? (
                  <Button href={`/projects/${project.id}/${payPath}`} variant="primary" className="w-[120px]">
                    Pay now
                  </Button>
                ) : null}
              </div>
            );
          })
        )}
      </Card>
    </>
  );
}
