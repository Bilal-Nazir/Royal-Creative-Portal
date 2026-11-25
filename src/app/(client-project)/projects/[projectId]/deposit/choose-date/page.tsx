import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getDepositInvoice } from "@/server/services/invoice-service";
import { canAct } from "@/server/services/permissions";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DatePickerForm } from "./date-picker-form";

const MONTH_YEAR = { year: 2026, monthIndex: 10, label: "November 2026" }; // matches the deposit due date in seed data

export default async function ChoosePaymentDatePage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/dashboard");

  const invoice = await getDepositInvoice(projectId);
  if (!invoice) redirect("/dashboard");
  if (!canAct(session)) redirect(`/projects/${projectId}/deposit`);

  const initialDay = invoice.dueDate ? new Date(invoice.dueDate).getUTCDate() : 5;

  return (
    <>
      <TopBar
        breadcrumb={`My projects  /  ${project.clientName}`}
        action={
          <NotificationsBell iconOnly />
        }
      />
      <PageHeader
        title="Choose a payment date"
        description="Pick the day you expect to make the deposit."
      />
      <Badge>Date selection</Badge>

      <Card className="flex flex-col gap-4 p-6">
        <DatePickerForm
          projectId={projectId}
          year={MONTH_YEAR.year}
          monthIndex={MONTH_YEAR.monthIndex}
          monthLabel={MONTH_YEAR.label}
          initialDay={initialDay}
        />
      </Card>
    </>
  );
}
