import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getHandoverResources } from "@/server/services/handover-service";
import { isLaunchChecklistComplete } from "@/server/domain/project";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Badge } from "@/components/ui/Badge";
import { ChecklistToggle } from "./checklist-toggle";
import { LaunchDetailsForm } from "./launch-details-form";
import { HandoverResourcesForm } from "./handover-resources-form";

/** A13 · Launch checklist — 4 checks, launch date/live URL, "Go live" (enabled only once all 4 checks are done), plus Handover resources. */
export default async function AgencyLaunchChecklistPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/agency/projects");

  const resources = await getHandoverResources(projectId);
  const checklist = project.launchChecklist;
  const allComplete = isLaunchChecklistComplete(checklist);
  const completeCount = [checklist.clientApproval, checklist.finalPayment, checklist.domainHosting, checklist.qualityChecks].filter(Boolean).length;

  return (
    <>
      <TopBar
        breadcrumb={`Royal Creative / Projects / ${project.name}`}
        action={
          <NotificationsBell iconOnly />
        }
      />
      <PageHeader
        eyebrow={`${project.clientName.toUpperCase()} · RC-1024`}
        title="Launch website"
        description={`${completeCount} of 4 checks complete · Client approval, payments, domain and hosting, and final quality review.`}
      />

      <Card className="flex flex-col gap-[10px] p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Launch checklist</h2>
        <ListRow title="Client approval" subtitle="Ticks automatically once the client approves the build" trailing={<Badge tone={checklist.clientApproval ? "success" : "neutral"}>{checklist.clientApproval ? "Complete" : "Pending"}</Badge>} />
        <ListRow title="Final payment" subtitle="Ticks automatically once the final invoice is paid" trailing={<Badge tone={checklist.finalPayment ? "success" : "neutral"}>{checklist.finalPayment ? "Complete" : "Pending"}</Badge>} />
        <ListRow title="Domain and hosting" subtitle="Manual check" trailing={<ChecklistToggle projectId={projectId} item="domainHosting" initialValue={checklist.domainHosting} />} />
        <ListRow title="Quality checks" subtitle="Manual check" trailing={<ChecklistToggle projectId={projectId} item="qualityChecks" initialValue={checklist.qualityChecks} />} />
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Launch details</h2>
        <LaunchDetailsForm projectId={projectId} initialLaunchDate={project.launchDate} initialLiveUrl={project.liveUrl} allChecksComplete={allComplete} />
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Handover resources</h2>
        <p className="text-xs text-ink-secondary">Deviation: no Figma screen for this section — see DESIGN_NOTES.</p>
        <HandoverResourcesForm projectId={projectId} resources={resources} />
      </Card>
    </>
  );
}
