import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { formatDate } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ListRow } from "@/components/ui/ListRow";

/** C14 · Launch scheduled — readiness "X of 4 complete", launch date, a contact button that opens the project conversation. */
export default async function LaunchScheduledPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/dashboard");

  const checklist = project.launchChecklist;
  const items = [
    { key: "domainHosting", title: "Domain and hosting", description: "Royal Creative is checking the domain connection.", complete: checklist.domainHosting },
    { key: "clientApproval", title: "Client approval", description: "Development build approved", complete: checklist.clientApproval },
    { key: "finalPayment", title: "Final payment", description: checklist.finalPayment ? "Payment confirmed" : "Payment pending", complete: checklist.finalPayment },
    { key: "qualityChecks", title: "Quality checks", description: "Forms, mobile layouts and redirects", complete: checklist.qualityChecks },
  ];
  const completeCount = items.filter((i) => i.complete).length;

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
        title={project.launchDate ? `Launch scheduled for ${formatDate(project.launchDate)}` : "Launch is being scheduled"}
        description="Royal Creative is completing the final checks. We'll notify you when your website is live."
      />
      <Card className="flex flex-col gap-[10px] p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Launch readiness · {completeCount} of 4 complete</h2>
        {items.map((item) => (
          <ListRow
            key={item.key}
            title={item.title}
            subtitle={item.description}
            trailing={<Badge tone={item.complete ? "success" : "neutral"}>{item.complete ? "Complete" : "In progress"}</Badge>}
          />
        ))}
      </Card>
      <Card className="flex flex-col gap-2 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Questions about launch?</h2>
        <p className="text-sm text-ink-secondary">Message {project.assigneeName}, your project lead.</p>
        {!checklist.finalPayment ? (
          <Button href={`/projects/${projectId}/final-payment`} variant="secondary" className="w-[196px]">
            Pay final balance
          </Button>
        ) : null}
        <Button href={`/projects/${projectId}/conversation`} variant="primary" className="w-[196px]">
          Message project lead
        </Button>
      </Card>
    </>
  );
}
