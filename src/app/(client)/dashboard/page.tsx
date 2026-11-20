import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { getClientDashboardData } from "@/server/services/project-service";
import { canAct } from "@/server/services/permissions";
import { STAGE_LABELS } from "@/server/domain/stage";
import { formatDate } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Button } from "@/components/ui/Button";

export default async function ClientDashboardPage() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") {
    redirect("/sign-in");
  }

  const { projects, activities, attentionTasks } = await getClientDashboardData(session.clientId);
  const userCanAct = canAct(session);
  const leadName = projects[0]?.contactName ?? "your project lead";
  const hasAttention = attentionTasks.length > 0;

  return (
    <>
      <TopBar
        breadcrumb="My projects"
        action={
          <NotificationsBell className="w-[180px]" />
        }
      />

      <PageHeader
        eyebrow="CLIENT PORTAL"
        title={`Welcome back, ${session.name}.`}
        description={
          hasAttention
            ? `${attentionTasks.length} project${attentionTasks.length > 1 ? "s" : ""} need${
                attentionTasks.length > 1 ? "" : "s"
              } your attention. Your project lead is ${leadName}.`
            : `You're all caught up. Your project lead is ${leadName}.`
        }
      />

      <Badge tone={hasAttention ? "warning" : "success"}>{hasAttention ? "Action required" : "All caught up"}</Badge>

      {hasAttention ? (
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">Needs your attention</h2>
          {attentionTasks.map((task) => (
            <ListRow key={task.id} title={task.title} subtitle={task.subtitle} trailing={<Badge>{task.badgeLabel}</Badge>} />
          ))}
          {userCanAct ? (
            <Button variant="primary" className="w-[196px]">
              {attentionTasks[0]?.ctaLabel ?? "Review"}
            </Button>
          ) : null}
        </Card>
      ) : null}

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Your projects</h2>
        {projects.map((project) => (
          <div key={project.id} className="flex flex-col gap-4">
            <ListRow
              title={project.name}
              subtitle={`${STAGE_LABELS[project.stage]} stage · Project lead: ${project.contactName}`}
              trailing={<Badge>{project.clientStatusLabel}</Badge>}
              href={`/projects/${project.id}/brief`}
            />
            <ListRow
              title="Next milestone"
              subtitle={`${project.nextMilestone.label} · ${formatDate(project.nextMilestone.date)}`}
              trailing={<Badge>{project.nextMilestone.waitingOn === "client" ? "With you" : "With Royal Creative"}</Badge>}
            />
          </div>
        ))}
        {projects.length === 0 ? <p className="text-sm text-ink-secondary">No projects yet.</p> : null}
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Recent activity</h2>
        {activities.map((activity) => (
          <ListRow key={activity.id} title={activity.title} subtitle={`${activity.description} · ${activity.occurredLabel}`} />
        ))}
        {activities.length === 0 ? <p className="text-sm text-ink-secondary">No activity yet.</p> : null}
      </Card>
    </>
  );
}
