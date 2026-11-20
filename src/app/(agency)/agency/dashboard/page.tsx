import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { getProjectsForAgencyUser } from "@/server/services/project-service";
import { getAgencyOverview } from "@/server/services/dashboard-service";
import { STAGE_LABELS, STAGE_ORDER, completedStageCount, progressFraction } from "@/server/domain/stage";
import type { Project } from "@/server/domain/project";
import { formatDate } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { ComparisonBars } from "@/components/charts/ComparisonBars";

function statusTone(statusLabel: string): "warning" | "info" {
  return statusLabel.toLowerCase().startsWith("awaiting") ? "warning" : "info";
}

function waitingOnLabel(waitingOn: Project["waitingOn"]): string {
  return waitingOn === "client" ? "Client" : "Royal Creative";
}

function ProjectCard({ project }: { project: Project }) {
  const tone = statusTone(project.statusLabel);
  const toneClass = tone === "warning" ? "text-brand-amber" : "text-info";
  const stagesTotal = STAGE_ORDER.length;
  const stagesDone = completedStageCount(project.stage);
  const pct = Math.round(progressFraction(project.stage) * 100);

  return (
    <Card className="flex w-full flex-col gap-3.5 p-5">
      <h3 className="font-heading text-xl font-semibold text-ink">{project.name}</h3>
      <p className="text-xs text-ink-secondary">Client · {project.clientName}</p>
      <span className={`inline-flex w-fit items-center rounded-[8px] bg-surface-2 px-2 py-1 text-xs ${toneClass}`}>
        {project.statusLabel}
      </span>
      <p className="text-xs text-ink-secondary">CURRENT STAGE</p>
      <p className="text-[13px] font-medium text-ink">{STAGE_LABELS[project.stage]}</p>
      <ProgressBar value={stagesDone} max={stagesTotal} label={`${STAGE_LABELS[project.stage]} stage progress`} />
      <p className="text-xs text-ink-secondary">
        {stagesDone}/{stagesTotal} stages · {pct}% complete
      </p>
      <div className="text-xs leading-relaxed text-ink-secondary">
        <p>Waiting on · {waitingOnLabel(project.waitingOn)}</p>
        <p>Assignee · {project.assigneeName}</p>
        <p>
          Due · {formatDate(project.dueDate)} · {project.openRevisions} open revision
          {project.openRevisions === 1 ? "" : "s"}
        </p>
      </div>
      <Button href={`/agency/projects/${project.id}`} variant="primary" className="w-full">
        Open project
      </Button>
    </Card>
  );
}

export default async function AgencyDashboardPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "agency") {
    redirect("/sign-in");
  }

  const [allProjects, overview] = await Promise.all([getProjectsForAgencyUser(session), getAgencyOverview()]);
  // "Needing attention" shows active projects only (handover is done), capped
  // at 6 — Figma's own mock is a filtered subset ("Showing 3 of 24"), not the
  // full project list; "View all projects" links to the full kanban board.
  const activeProjects = allProjects.filter((p) => p.stage !== "handover");
  const projects = activeProjects.slice(0, 6);

  return (
    <>
      <TopBar
        breadcrumb="Royal Creative / Dashboard"
        action={
          <NotificationsBell className="w-[200px]" />
        }
      />

      <PageHeader
        eyebrow="AGENCY WORKSPACE"
        title="Agency dashboard"
        description={overview.periodLabel}
        action={
          <Button href="/agency/projects/new" variant="primary" className="w-[220px]">
            Create project
          </Button>
        }
      />

      <div className="flex flex-wrap gap-4">
        {overview.metricCards.map((metric) => (
          <StatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            deltaLabel={metric.deltaLabel}
            tone={metric.tone}
            className="min-w-[160px] flex-1"
          />
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <ComparisonBars panel={overview.deliveryComparison} />
        </div>
        <Card className="flex flex-1 flex-col p-5">
          <h3 className="font-heading text-xl font-semibold text-ink">Active projects by type</h3>
          <div className="mt-3.5 flex flex-col gap-3">
            {overview.activeProjectsByType.map((type) => (
              <div key={type.label} className="flex items-center justify-between text-[13px] font-medium">
                <span className="text-ink-secondary">{type.label}</span>
                <span className="text-ink">
                  {type.count} project{type.count === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3.5 text-xs text-ink-secondary">{overview.activeProjectsByTypeFootnote}</p>
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <ComparisonBars panel={overview.collectionsByMilestone} />
        </div>
        <Card className="flex flex-1 flex-col gap-3.5 p-5">
          <h3 className="font-heading text-xl font-semibold text-ink">Commercial snapshot</h3>
          <div className="mt-3.5 flex flex-col gap-3">
            {overview.commercialSnapshot.map((metric) => (
              <div key={metric.label} className="flex items-center gap-4 rounded-rc-control bg-surface-2 p-3.5">
                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-[13px] font-medium text-ink">{metric.label}</p>
                  <p className="text-xs text-ink-secondary">{metric.sublabel}</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-[8px] bg-surface-2 px-2 py-1 text-xs ${
                    metric.tone === "success" ? "text-success" : metric.tone === "warning" ? "text-brand-amber" : "text-ink"
                  }`}
                >
                  {metric.valueLabel}
                </span>
              </div>
            ))}
          </div>
          <Button href="/agency/payments" variant="primary" className="mt-3.5 w-full">
            Open payments
          </Button>
        </Card>
      </div>

      <h2 className="font-heading text-xl font-semibold text-ink">Projects needing attention</h2>
      <p className="text-sm text-ink-secondary">
        Showing {projects.length} of {activeProjects.length} active projects. Open Projects to filter by stage, status
        or assignee.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
        {projects.length === 0 ? <p className="text-sm text-ink-secondary">No projects assigned to you yet.</p> : null}
      </div>

      <Button href="/agency/projects" variant="secondary" className="w-[220px]">
        View all projects
      </Button>
    </>
  );
}
