import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/server/auth/cookies";
import { projectRepository } from "@/server/repositories/container";
import { getScopeChanges } from "@/server/services/scope-change-service";
import { canAct } from "@/server/services/permissions";
import { formatGBP, formatDate } from "@/lib/format";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ListRow } from "@/components/ui/ListRow";
import { ReadOnlyNotice } from "@/components/project/ReadOnlyNotice";
import { EmptyReviewCard } from "@/components/project/EmptyReviewCard";
import { DecideButtons } from "./decide-buttons";

/** R09 · Scope change review — requested addition, additional fee, timeline impact, accept or decline. */
export default async function ScopeChangesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "client") redirect("/sign-in");

  const { projectId } = await params;
  const project = await projectRepository.findById(projectId);
  if (!project) redirect("/dashboard");

  const scopeChanges = await getScopeChanges(projectId);
  const breadcrumb = `My projects  /  ${project.clientName}`;
  const notifications = (
    <NotificationsBell iconOnly />
  );
  const userCanAct = canAct(session);
  const pending = scopeChanges.filter((s) => s.status === "pending");
  const decided = scopeChanges.filter((s) => s.status !== "pending");

  if (scopeChanges.length === 0) {
    return (
      <>
        <TopBar breadcrumb={breadcrumb} action={notifications} />
        <PageHeader title="No scope changes" description="You'll see any requests here." />
        <EmptyReviewCard title="Nothing to review" description="Royal Creative hasn't sent any scope change requests yet." />
      </>
    );
  }

  return (
    <>
      <TopBar breadcrumb={breadcrumb} action={notifications} />
      <PageHeader
        title={pending[0]?.title ?? "A request beyond the agreed scope"}
        description={pending[0] ? undefined : "Review past scope decisions below."}
      />

      {pending.map((change) => (
        <div key={change.id} className="flex flex-col gap-4">
          <Badge tone="warning">Awaiting scope decision</Badge>
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="font-heading text-xl font-semibold text-ink">Requested addition</h2>
            <p className="text-sm text-ink-secondary">{change.description}</p>
          </Card>
          <Card className="flex flex-col gap-4 p-6">
            <h2 className="font-heading text-xl font-semibold text-ink">Proposed adjustment</h2>
            <ListRow title="Additional fee" subtitle="Example estimate" trailing={<Badge>{formatGBP(change.additionalFee)}</Badge>} />
            <ListRow title="Timeline impact" subtitle="Example additional delivery time" trailing={<Badge>{change.timelineImpact}</Badge>} />
            {userCanAct ? (
              <DecideButtons projectId={projectId} scopeChangeId={change.id} title={change.title} />
            ) : (
              <ReadOnlyNotice action="accepting or declining scope changes" />
            )}
          </Card>
          <Card className="flex flex-col gap-2 p-6">
            <h2 className="font-heading text-xl font-semibold text-ink">Existing work</h2>
            <p className="text-sm text-ink-secondary">Included bug fixes and agreed revisions continue independently of this optional addition.</p>
          </Card>
        </div>
      ))}

      {decided.length > 0 ? (
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">Past scope changes</h2>
          {decided.map((change) => (
            <ListRow
              key={change.id}
              title={change.title}
              subtitle={`${formatGBP(change.additionalFee)} · ${change.timelineImpact} · ${change.decidedAt ? formatDate(change.decidedAt) : ""}`}
              trailing={<Badge tone={change.status === "accepted" ? "success" : "neutral"}>{change.status}</Badge>}
            />
          ))}
        </Card>
      ) : null}
    </>
  );
}
